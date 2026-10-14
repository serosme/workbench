/**
 * 把上游 OpenAI 兼容 SSE 里相邻的文本 / 思考增量合并成一个事件，再交给 AI SDK。
 *
 * 为什么需要：Workers 上「每个 chunk 穿过 AI SDK 那几层 TransformStream」有固定 CPU 开销
 * （实测每个 event 约 0.7~1 ms），而上游是「一个 token 一帧」。一段几千 token 的回复就是把这个
 * 开销乘以几千，Free 套餐的 CPU 额度会被烧穿（`outcome: exceededCpu`，对话流到一半被终止）。
 * 在字节层把相邻增量并成 ≥ MIN_CHARS 字一帧，进 SDK 的 event 数下降一到两个数量级（合成流 2000 → 38，
 * 真实 DeepSeek 流 403 → 25），客户端打字机的观感不变：`app/utils/chat-smooth.ts` 本来就按自己的节奏
 * 重新切片，收到的 chunk 变大只是它一次多切几个字。
 *
 * 只合并「我们能无损重建整帧」的增量：单 choice、`finish_reason` 为 null、`delta` 里除空占位外只有一段
 * content / reasoning_content，或一段「只带 index + function.arguments 的单个 tool_calls 续帧」。其余帧
 * （role、带 id / function.name 的 tool_calls 首帧、finish_reason、usage、`[DONE]`、解析失败的帧）一律连
 * 分帧符原样透传：mergedFrame 是从零重建的，凡是没被显式拷贝的字段都会丢，所以只碰内容可以穷举的帧。
 *
 * 工具参数同样是「一个 token 一帧」，而工具常常吃整段 SQL，帧数比正文还多（实测一次工具调用可达上千帧），
 * 所以它必须一起合并。SDK 侧对参数就是 `function.arguments` 的字符串拼接（openai-compatible 先把参数攒在
 * `pendingToolCalls.bufferedArguments`，之后每个分片直接进 StreamingToolCallTracker 追加），
 * 按 (choice, tool_call) 分组合并没有任何语义变化。
 */
type FetchLike = typeof globalThis.fetch

/** 攒够这么多字就发一帧 */
const MIN_CHARS = 48
/** 上游很慢时也保证这么长时间发一帧，别让界面看着卡住 */
const FLUSH_MS = 250

const encoder = new TextEncoder()
/** SSE 用空行分帧，CRLF 与 LF 都要认 */
const FRAME_SEPARATORS = ['\r\n\r\n', '\n\n']

interface ChatChunk {
  id?: string
  object?: string
  created?: number
  model?: string
  system_fingerprint?: string
  choices?: {
    index?: number
    finish_reason?: string | null
    delta?: Record<string, unknown>
  }[]
}

/** 可合并的增量：正文、思考，或工具参数（tool_call 的 arguments 续帧） */
type DeltaKind = 'content' | 'reasoning_content' | 'tool-args'

interface Delta {
  index: number
  /** 仅 tool-args 有意义：tool_calls 数组里的下标；其余类型恒为 0 */
  callIndex: number
  kind: DeltaKind
  text: string
}

interface Pending extends Delta {
  /** 首帧只借来重建骨架（id / object / created / model / system_fingerprint），其余字段不复制 */
  chunk: ChatChunk
}

/** 取缓冲区里最早的一帧 */
function takeFrame(buffer: string): { frame: string, rest: string, separator: string } | null {
  let at = -1
  let width = 0
  let used = '\n\n'
  for (const separator of FRAME_SEPARATORS) {
    const found = buffer.indexOf(separator)
    if (found >= 0 && (at < 0 || found < at)) {
      at = found
      width = separator.length
      used = separator
    }
  }
  if (at < 0)
    return null
  return { frame: buffer.slice(0, at), rest: buffer.slice(at + width), separator: used }
}

/**
 * 一帧的 data 字段；只有「帧内除空行外恰好一行 data:」才返回、才允许被合并。
 *
 * 多行 data（SSE 规范要用换行拼接）、以及 event: / id: / retry: 这类帧一律返回 null 走原样透传：
 * mergedFrame 只会重建一条 data: 行，合并它们会把其它字段悄悄丢掉。
 */
function frameData(frame: string): string | null {
  let value: string | null = null
  for (const line of frame.split(/\r?\n/)) {
    if (line === '')
      continue
    if (value !== null || !line.startsWith('data:'))
      return null
    value = line.slice('data:'.length)
    if (value.startsWith(' '))
      value = value.slice(1)
  }
  return value
}

/**
 * 只带 `index` + `function.arguments` 的单个 tool_calls 续帧；其余形状一律返回 null 走透传。
 *
 * 带 `id` / `function.name` 的首帧必须原样透传：SDK 靠它建出 tool call，而且它可能还夹带 `type` /
 * `extra_content` 之类的 provider 专属字段，重建会丢。多个 tool_calls、参数以外字段有值也不合并。
 * 收益上也不亏：SDK 收到 name 之前本来就在缓冲参数，那一帧的参数只是个很短的初始片段。
 */
function toolArgumentsDelta(value: unknown): { index: number, arguments: string } | null {
  if (!Array.isArray(value) || value.length !== 1)
    return null
  const [call] = value as {
    index?: number
    id?: unknown
    type?: unknown
    extra_content?: unknown
    function?: { name?: unknown, arguments?: unknown }
  }[]
  if (!call || typeof call !== 'object' || call.index == null)
    return null
  if (call.id != null || call.type != null || call.extra_content != null || call.function?.name != null)
    return null
  const args = call.function?.arguments
  if (typeof args !== 'string' || args === '')
    return null
  return { index: call.index, arguments: args }
}

/** 判定一帧能不能并进待发缓冲：必须是纯文本增量或纯工具参数续帧 */
function mergeableDelta(chunk: ChatChunk): Delta | null {
  if (!Array.isArray(chunk.choices) || chunk.choices.length !== 1)
    return null
  const [choice] = chunk.choices
  if (!choice || choice.finish_reason != null || !choice.delta)
    return null
  // 增量形状各端点不统一：DeepSeek 每帧都是 {content: null, reasoning_content: "…"}，
  // 所以不能要求「只有一个键」——空占位一律跳过，真正带值的那一段只允许一个
  let hit: { kind: DeltaKind, text: string, callIndex: number } | null = null
  for (const [key, value] of Object.entries(choice.delta)) {
    if (value == null || value === '')
      continue
    if (hit)
      return null
    if (key === 'tool_calls') {
      const call = toolArgumentsDelta(value)
      if (!call)
        return null
      hit = { kind: 'tool-args', text: call.arguments, callIndex: call.index }
      continue
    }
    if (key !== 'content' && key !== 'reasoning_content')
      return null
    if (typeof value !== 'string')
      return null
    hit = { kind: key, text: value, callIndex: 0 }
  }
  if (!hit)
    return null
  return { index: choice.index ?? 0, kind: hit.kind, text: hit.text, callIndex: hit.callIndex }
}

/** 用待发缓冲最后那一帧做骨架重建一帧：只保留必要字段，避免把 usage 之类的顺手复制一遍 */
function mergedFrame(pending: Pending): string {
  const { chunk } = pending
  // 重建出来的 tool_calls 帧只有 index + arguments：能走到这里的本来就只带这两样（见 toolArgumentsDelta）
  const delta = pending.kind === 'tool-args'
    ? { tool_calls: [{ index: pending.callIndex, function: { arguments: pending.text } }] }
    : { [pending.kind]: pending.text }
  const merged: ChatChunk = { choices: [{ index: pending.index, delta, finish_reason: null }] }
  if (chunk.id != null)
    merged.id = chunk.id
  if (chunk.object != null)
    merged.object = chunk.object
  if (chunk.created != null)
    merged.created = chunk.created
  if (chunk.model != null)
    merged.model = chunk.model
  if (chunk.system_fingerprint != null)
    merged.system_fingerprint = chunk.system_fingerprint
  return `data: ${JSON.stringify(merged)}\n\n`
}

/**
 * 包一层上游 fetch：响应体照样流式返回，只是把相邻的文本 / 思考 / 工具参数增量先合并。
 * 用法：`createOpenAICompatible({ ..., fetch: coalescingFetch(globalThis.fetch) })`
 */
export function coalescingFetch(inner: FetchLike): FetchLike {
  return async function coalescing(input, init) {
    const response = await inner(input, init)
    if (!response.body)
      return response

    // TextDecoder 的 stream 模式带「跨调用的残余状态」，必须每请求一份：模块级共享时，
    // 并发流的半截多字节字符会接到另一条流的字节前面，而且上游出错走 catch 会跳过收尾、
    // 把残余字节留给下一个请求（两条路径都实测会静默乱码）
    const decoder = new TextDecoder()
    const reader = response.body.getReader()
    let buffer = ''
    let pending: Pending | null = null
    let timer: ReturnType<typeof setTimeout> | undefined
    let closed = false

    // 主动把上游读完、把合并后的帧推进队列，不跟着下游背压走：合并后输出只有上游的 ~1/20，
    // 单用户这一点缓冲可以忽略，换来读循环里不用维护「pull 并发 + 定时器」两套状态
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        function emit(frame: string) {
          if (!closed)
            controller.enqueue(encoder.encode(frame))
        }

        function flush() {
          if (timer) {
            clearTimeout(timer)
            timer = undefined
          }
          if (!pending)
            return
          emit(mergedFrame(pending))
          pending = null
        }

        /** 上游很慢、攒不满 MIN_CHARS 时的兜底：到点就把手上的发出去 */
        function schedule() {
          if (!timer) {
            timer = setTimeout(() => {
              timer = undefined
              flush()
            }, FLUSH_MS)
          }
        }

        /** 不能合并的帧：先把待发缓冲吐干净，再原样透传（连分帧符都不动），保持顺序 */
        function pass(frame: string, separator: string) {
          flush()
          emit(`${frame}${separator}`)
        }

        function handle(frame: string, separator: string) {
          const data = frameData(frame)
          if (data === null || data === '[DONE]')
            return pass(frame, separator)
          let chunk: ChatChunk
          try {
            chunk = JSON.parse(data) as ChatChunk
          }
          catch {
            return pass(frame, separator)
          }
          const delta = mergeableDelta(chunk)
          if (!delta)
            return pass(frame, separator)
          // 换段就 flush：正文 / 思考 / 工具参数之间，以及不同 tool_call 之间都不能混在一帧里
          if (pending && (pending.kind !== delta.kind || pending.index !== delta.index || pending.callIndex !== delta.callIndex))
            flush()
          if (pending)
            pending.text += delta.text
          else
            pending = { chunk, ...delta }
          if (pending.text.length >= MIN_CHARS)
            flush()
          else
            schedule()
        }

        async function pump() {
          try {
            for (;;) {
              const { done, value } = await reader.read()
              if (done)
                break
              buffer += decoder.decode(value, { stream: true })
              let taken = takeFrame(buffer)
              while (taken) {
                buffer = taken.rest
                handle(taken.frame, taken.separator)
                taken = takeFrame(buffer)
              }
            }
            buffer += decoder.decode()
            // 上游结束时可能还剩一帧没有尾随空行，补一个分帧符当作完整帧处理
            if (buffer.length > 0)
              handle(buffer, '\n\n')
            flush()
            closed = true
            controller.close()
          }
          // 上游断流 / 流被取消都要落成 stream error，否则客户端会一直挂在没有结束的响应上
          catch (error) {
            closed = true
            controller.error(error)
          }
        }

        void pump()
      },

      async cancel(reason) {
        closed = true
        if (timer) {
          clearTimeout(timer)
          timer = undefined
        }
        await reader.cancel(reason)
      },
    })

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}

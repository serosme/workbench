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
 * 只合并「单 choice、`finish_reason` 为 null、`delta` 里只带一段 content / reasoning_content（另一个键是 null
 * 占位）」的帧；其余帧（role、tool_calls、finish_reason、usage、`[DONE]`、解析失败的帧）一律原样透传 ——
 * tool_calls 的参数是逐段流的，合并会破坏 SDK 的部分解析语义。
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

type TextKind = 'content' | 'reasoning_content'

interface Pending {
  chunk: ChatChunk
  index: number
  kind: TextKind
  text: string
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

/** 判定一帧能不能并进待发缓冲：必须是纯文本增量 */
function textDelta(chunk: ChatChunk): { index: number, kind: TextKind, text: string } | null {
  if (!Array.isArray(chunk.choices) || chunk.choices.length !== 1)
    return null
  const [choice] = chunk.choices
  if (!choice || choice.finish_reason != null || !choice.delta)
    return null
  // 增量形状各端点不统一：DeepSeek 每帧都是 {content: null, reasoning_content: "…"}，
  // 所以不能要求「只有一个键」——只允许这两个键，且恰好一个是非空字符串
  let hit: { kind: TextKind, text: string } | null = null
  for (const [key, value] of Object.entries(choice.delta)) {
    if (key !== 'content' && key !== 'reasoning_content')
      return null
    if (value == null || value === '')
      continue
    if (typeof value !== 'string' || hit)
      return null
    hit = { kind: key, text: value }
  }
  if (!hit)
    return null
  return { index: choice.index ?? 0, kind: hit.kind, text: hit.text }
}

/** 用待发缓冲最后那一帧做骨架重建一帧：只保留必要字段，避免把 usage 之类的顺手复制一遍 */
function mergedFrame(pending: Pending): string {
  const { chunk } = pending
  const merged: ChatChunk = { choices: [{ index: pending.index, delta: { [pending.kind]: pending.text }, finish_reason: null }] }
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
 * 包一层上游 fetch：响应体照样流式返回，只是把相邻的文本增量先合并。
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
          const delta = textDelta(chunk)
          if (!delta)
            return pass(frame, separator)
          if (pending && (pending.kind !== delta.kind || pending.index !== delta.index))
            flush()
          if (pending)
            pending.text += delta.text
          else
            pending = { chunk, index: delta.index, kind: delta.kind, text: delta.text }
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

import type { UIMessage, UIMessageChunk } from 'ai'
import { DefaultChatTransport } from 'ai'

/** 常态打字速度（字符 / 秒）：积压很小时保持这个节奏，留住「打字感」 */
const BASE_CHARS_PER_SECOND = 120
/** 追赶系数：积压 N 字就额外提速 N / CATCH_UP_SECONDS。稳态下显示最多落后它这么多秒 */
const CATCH_UP_SECONDS = 0.5
/** 兜底上限：极端积压时也别一帧糊太多 */
const MAX_CHARS_PER_SECOND = 2500
/** 一帧最多吐多少字符（按最高速算），同时是额度上限，防止暂停后一次性糊一大段 */
const FRAME_BUDGET = MAX_CHARS_PER_SECOND / 60

type TextDeltaChunk = Extract<UIMessageChunk, { type: 'text-delta' }>

/** 输出队列的一段：正文攒成一段按节奏吐，其余块排在正文后面原样透传，保证顺序 */
interface TextSegment { kind: 'text', delta: TextDeltaChunk, text: string }
interface ChunkSegment { kind: 'chunk', chunk: UIMessageChunk }
type Segment = TextSegment | ChunkSegment

/** 等下一帧；后台标签页里 rAF 不再触发，用 timeout 兜底免得整个流挂住 */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 100)
    requestAnimationFrame(() => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/**
 * 客户端「均匀打字机」：把 text-delta 按时间节奏重新切片后再往下游发，
 * 其余块（思考、工具、end / finish 等）排在正文后面原样透传。
 *
 * 放在客户端做是因为服务端逐 chunk 加工会把 Worker 的 CPU 烧穿（见 AGENTS.md 的「CPU 限制」）。
 *
 * **关键是「不背压」**：`transform` 只入队就返回，上游才能全速读完，队列长度因此才等于
 * 「已收到、还没显示」的真实积压。早先的写法在 `transform` 里 await 着把当前 chunk 吐干净才返回，
 * `pipeTo` 于是背压上游，队列永远只有一个 chunk 长（≤48 字），速率里的积压项恒为 0、
 * 退化成固定的基础速度——实测 1500 字要 12.5s。速率 = 基础速度 + 积压 / CATCH_UP_SECONDS：
 * 稳态下显示最多落后 CATCH_UP_SECONDS 秒，突发时按对数速度收敛（1500 字 ~1.6s、7400 字 ~2.4s），
 * 于是「上游慢时像打字机、上游一次性涌进来时很快追平」。
 *
 * 只 pace 正文：reasoning-delta 走透传，它默认折叠、用户不逐字读，pace 它等于凭空多一半滞后。
 */
export function smoothChunkTransform(): TransformStream<UIMessageChunk, UIMessageChunk> {
  const queue: Segment[] = []
  /** 可输出的字符额度，按帧累积 */
  let credit = 0
  let out: TransformStreamDefaultController<UIMessageChunk> | null = null
  let pumping: Promise<void> | null = null

  /** 队列里还没吐出去的正文总字数，就是当前的「积压」 */
  function pendingChars() {
    let total = 0
    for (const segment of queue) {
      if (segment.kind === 'text')
        total += segment.text.length
    }
    return total
  }

  /**
   * 队列是在 `transform` 之外吐的：用户点 Stop 会让 controller 关闭，这里的 enqueue 会抛，
   * 而它在 transform 之外、无处可抛，所以就地收尾（丢掉剩余队列）。
   */
  function emit(chunk: UIMessageChunk) {
    if (!out)
      return false
    try {
      out.enqueue(chunk)
      return true
    }
    catch {
      out = null
      return false
    }
  }

  async function pump() {
    let previous = performance.now()
    while (out) {
      const head = queue[0]
      if (!head)
        return

      // 非正文块：不 pace，到队头就原样透传
      if (head.kind === 'chunk') {
        queue.shift()
        if (!emit(head.chunk))
          return
        continue
      }

      if (head.text.length === 0) {
        queue.shift()
        continue
      }

      if (credit < 1) {
        if (document.hidden) {
          // 后台标签页：rAF 不再触发，直接全速吐完，别把连接挂在 nextFrame 上
          credit = head.text.length
        }
        else {
          await nextFrame()
          const now = performance.now()
          // 基础速度 + 与「还没吐出去的积压」成正比的追赶项：稳态落后 < CATCH_UP_SECONDS 秒，
          // 一次性涌进来时按对数速度收敛（1500 字 ~1.6s、7400 字 ~2.4s）
          const rate = Math.min(
            MAX_CHARS_PER_SECOND,
            BASE_CHARS_PER_SECOND + pendingChars() / CATCH_UP_SECONDS,
          )
          // 卡顿（或刚从后台切回来）导致的超大间隔夹一下，额度也封顶
          credit = Math.min(credit + (Math.min(now - previous, 250) / 1000) * rate, FRAME_BUDGET)
          previous = now
        }
        continue
      }

      const size = Math.min(Math.floor(credit), head.text.length)
      if (!emit({ ...head.delta, delta: head.text.slice(0, size) }))
        return
      head.text = head.text.slice(size)
      credit -= size
    }
  }

  function kick() {
    if (!pumping)
      pumping = pump().finally(() => { pumping = null })
    return pumping
  }

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    start(controller) {
      out = controller
    },

    transform(chunk) {
      if (chunk.type === 'text-delta') {
        const tail = queue[queue.length - 1]
        // 同一条 part 的增量攒进同一段；换 id 就是新的一段
        if (tail?.kind === 'text' && tail.delta.id === chunk.id)
          tail.text += chunk.delta
        else
          queue.push({ kind: 'text', delta: chunk, text: chunk.delta })
      }
      else {
        queue.push({ kind: 'chunk', chunk })
      }
      void kick()
    },

    // 上游结束后要把队列里剩下的吐完再关，否则尾部会被截断
    async flush() {
      while (queue.length > 0) {
        await kick()
        // 出错 / 被取消时 out 会被置空，这时直接收尾，别死等
        if (!out)
          break
      }
      out = null
    },
  })
}

/**
 * 接上打字机的 chat transport：`processResponseStream` 是 `DefaultChatTransport` 的扩展点
 * （AI SDK 7 没有客户端 stream transform 钩子），在这里插一层比在模板里自己维护一份
 * 「显示用文本」简单得多——part 的 streaming 状态、`status`、`isPartStreaming` 全由 SDK 维护。
 */
export class SmoothChatTransport extends DefaultChatTransport<UIMessage> {
  protected override processResponseStream(stream: ReadableStream<Uint8Array>) {
    return super.processResponseStream(stream).pipeThrough(smoothChunkTransform())
  }
}

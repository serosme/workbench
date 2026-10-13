import type { UIMessage, UIMessageChunk } from 'ai'
import { DefaultChatTransport } from 'ai'

/** 基础速度（字符 / 秒）；积压 N 个字符时额外提速 N / CATCH_UP_SECONDS，最高 MAX_CHARS_PER_SECOND */
const CHARS_PER_SECOND = 120
const CATCH_UP_SECONDS = 2
const MAX_CHARS_PER_SECOND = 400
/** 一帧最多吐多少字符（按最高速算），同时是额度上限，防止暂停后一次性糊一大段 */
const FRAME_BUDGET = MAX_CHARS_PER_SECOND / 60

type DeltaChunk = Extract<UIMessageChunk, { type: 'text-delta' | 'reasoning-delta' }>

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
 * 客户端「均匀打字机」：把 `UIMessageChunk` 流里的 text-delta / reasoning-delta
 * 按时间节奏重新切片后再往下游发。
 *
 * 放在客户端做是因为服务端逐 chunk 加工会把 Worker 的 CPU 烧穿（见 AGENTS.md 的「CPU 限制」）。
 * 节奏用 `requestAnimationFrame` + 时间累加（credit）算，而不是每拍一个 `setTimeout`：
 * 后者会漂移、跟屏幕帧也对不齐。延迟只发生在 `text-end` 之前，
 * 所以 part 的 streaming 状态、`status`、`isPartStreaming` 的表现与原来一致。
 */
export function smoothChunkTransform(): TransformStream<UIMessageChunk, UIMessageChunk> {
  let lastDelta: DeltaChunk | null = null
  let buffer = ''
  /** 可输出的字符额度，按帧累积 */
  let credit = 0

  function flush(controller: TransformStreamDefaultController<UIMessageChunk>) {
    if (lastDelta && buffer) {
      controller.enqueue({ ...lastDelta, delta: buffer })
    }
    buffer = ''
    credit = 0
  }

  return new TransformStream<UIMessageChunk, UIMessageChunk>({
    async transform(chunk, controller) {
      if (chunk.type !== 'text-delta' && chunk.type !== 'reasoning-delta') {
        flush(controller)
        controller.enqueue(chunk)
        return
      }

      // 换段（不同 id / type）时先把上一段的残留发完
      if (lastDelta && (lastDelta.type !== chunk.type || lastDelta.id !== chunk.id)) {
        flush(controller)
      }

      lastDelta = chunk
      buffer += chunk.delta

      let previous = performance.now()
      while (buffer.length > 0) {
        // 额度不够就等下一帧，够了就直接吐（小 delta 时不会被硬生生压成每帧一个字）
        if (credit < 1) {
          if (document.hidden) {
            // 后台标签页：rAF 不再触发，直接全速吐完，别把连接挂在 nextFrame 上
            credit = buffer.length
          }
          else {
            await nextFrame()
            const now = performance.now()
            const rate = Math.min(
              MAX_CHARS_PER_SECOND,
              CHARS_PER_SECOND + buffer.length / CATCH_UP_SECONDS,
            )
            // 卡顿（或刚从后台切回来）导致的超大间隔夹一下，额度也封顶
            credit = Math.min(
              credit + (Math.min(now - previous, 250) / 1000) * rate,
              FRAME_BUDGET,
            )
            previous = now
          }
          continue
        }

        const size = Math.min(Math.floor(credit), buffer.length)
        controller.enqueue({ ...chunk, delta: buffer.slice(0, size) })
        buffer = buffer.slice(size)
        credit -= size
      }
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

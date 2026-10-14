import type { UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isLoopFinished,
  streamText,
  toUIMessageStream,
} from 'ai'
import { defineEventHandler, readBody, useRuntimeConfig } from 'nuxt/server'

interface ChatBody {
  messages: UIMessage[]
  model: string
}

// 同 login.post.ts：nuxt/server 的 defineEventHandler 只收返回值类型，这里声明不了 body 形状
export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody<ChatBody>(event)
  const { chatBaseUrl, chatApiKey } = useRuntimeConfig()

  const provider = createOpenAICompatible({
    name: 'chat',
    baseURL: chatBaseUrl,
    apiKey: chatApiKey,
    // 上游一个 token 一帧，逐帧穿过 AI SDK 的流式管线在 Workers 上每帧都有固定 CPU 开销，先合并再交给 SDK
    fetch: coalescingFetch(globalThis.fetch),
  })

  const result = streamText({
    model: provider(model),
    messages: await convertToModelMessages(messages),
    tools: aiTools,
    stopWhen: isLoopFinished(),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendReasoning: true }),
  })
})

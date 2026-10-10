import type { UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isStepCount,
  smoothStream,
  streamText,
  toUIMessageStream,
} from 'ai'
import { defineEventHandler, readBody, useRuntimeConfig } from 'nuxt/server'

interface ChatBody {
  messages: UIMessage[]
  model: string
}

const zhWordSegmenter = new Intl.Segmenter('zh', { granularity: 'word' })

export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody<ChatBody>(event)
  const { chatBaseUrl, chatApiKey } = useRuntimeConfig()

  const provider = createOpenAICompatible({
    name: 'commandcode',
    baseURL: chatBaseUrl,
    apiKey: chatApiKey,
  })

  const result = streamText({
    model: provider(model),
    messages: await convertToModelMessages(messages),
    tools: aiTools,
    stopWhen: isStepCount(3),
    experimental_transform: smoothStream({
      delayInMs: 12,
      chunking: zhWordSegmenter,
    }),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendReasoning: true }),
  })
})

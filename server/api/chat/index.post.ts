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
    stopWhen: isLoopFinished(),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendReasoning: true }),
  })
})

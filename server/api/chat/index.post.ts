import type { UIMessage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  isLoopFinished,
  smoothStream,
  streamText,
  toUIMessageStream,
} from 'ai'
import { createError, defineEventHandler, readBody, useRuntimeConfig } from 'nuxt/server'
import { z } from 'zod'

const chatBodySchema = z.object({
  messages: z.array(
    z.custom<UIMessage>(message => typeof message === 'object' && message !== null && Array.isArray((message as UIMessage).parts)),
  ).min(1),
  model: z.string().min(1),
})

export default defineEventHandler(async (event) => {
  const parsed = chatBodySchema.safeParse(await readBody(event))
  if (!parsed.success)
    throw createError({ statusCode: 400, message: 'Invalid chat request' })
  const { messages, model } = parsed.data
  const { chatBaseUrl, chatApiKey } = useRuntimeConfig()

  const provider = createOpenAICompatible({
    name: 'chat',
    baseURL: chatBaseUrl,
    apiKey: chatApiKey,
  })

  const result = streamText({
    model: provider(model),
    system: `Be concise: answer directly, with no preamble, no restating of the question and no padding.
Use plain text and ordinary punctuation only: no emoji, no decorative symbols (arrows such as →, checkmarks, circled numbers, bullet marks) and no ASCII-art separators.
Stay within your own capabilities — this conversation, your own knowledge and the results of the tools you can call. Never guess at, or pretend to have, anything beyond them: if you cannot get something, say so instead of inventing it.`,
    messages: await convertToModelMessages(messages),
    tools: aiTools,
    experimental_transform: smoothStream({
      delayInMs: 100,
      chunking: 'line',
    }),
    stopWhen: isLoopFinished(),
  })

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendReasoning: true }),
  })
})

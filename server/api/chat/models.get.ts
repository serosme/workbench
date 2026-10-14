import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

interface ProviderModelsResponse {
  data: { id: string, name?: string }[]
}

// 可选模型由 provider 的 OpenAI 兼容 `GET {chatBaseUrl}/models` 提供。
// 在服务端代理是因为请求要带 chatApiKey，而 runtimeConfig.public 会被打进客户端产物。
// label 优先用 provider 的 name（如 DeepSeek-V4.1-Flash），只回标准 OpenAI 字段的端点退回 id。
export default defineEventHandler(async () => {
  const { chatBaseUrl, chatApiKey } = useRuntimeConfig()

  const { data } = await $fetch<ProviderModelsResponse>(`${chatBaseUrl.replace(/\/+$/, '')}/models`, {
    headers: { Authorization: `Bearer ${chatApiKey}` },
  })

  return data.map((model): ChatModel => ({ label: model.name ?? model.id, value: model.id }))
})

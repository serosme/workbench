import { createError, defineEventHandler, readBody, useRuntimeConfig, useSession } from 'nuxt/server'

// 单用户登录：密码由 NUXT_AUTH_PASSWORD 提供（runtimeConfig.authPassword）。
// 校验通过后用 Nuxt 4.6 的 useSession 写入 nuxt-session，由应用密钥 NUXT_APP_SECRET 密封。
export default defineEventHandler(async (event) => {
  const { password } = await readBody<{ password: string }>(event)
  const { authPassword } = useRuntimeConfig()

  if (!authPassword || password !== authPassword) {
    throw createError({ status: 400, message: 'Wrong password' })
  }

  const session = await useSession<{ authed: boolean }>(event, { maxAge: 60 * 60 * 24 })
  await session.update({ authed: true })
})

import { createError, defineEventHandler, readBody, useRuntimeConfig, useSession } from 'nuxt/server'

interface LoginBody {
  password: string
}

// 单用户登录：密码由 NUXT_AUTH_PASSWORD 提供（runtimeConfig.authPassword）。
// 校验通过后用 Nuxt 4.6 的 useSession 写入 nuxt-session，由应用密钥 NUXT_APP_SECRET 密封。
// 注意：这里不能声明请求形状（`defineEventHandler<{ body: ...}>`），nuxt/server 的版本只收返回值类型；
// 真要拿回 body 类型得改用 h3 的 defineEventHandler，但那会让 useSession 收到不可移植的 h3 event（NUXT_E8012）。
export default defineEventHandler(async (event) => {
  const { password } = await readBody<LoginBody>(event)
  const { authPassword } = useRuntimeConfig()

  if (!authPassword || password !== authPassword) {
    throw createError({ status: 400, message: 'Wrong password' })
  }

  // sameSite 保持 lax：跨站 POST 不带 cookie，是本项目 CSRF 防护的关键，不要改成 'none'
  const session = await useSession<{ authed: boolean }>(event, {
    maxAge: 60 * 60 * 24,
    cookie: { sameSite: 'lax' },
  })
  await session.update({ authed: true })
})

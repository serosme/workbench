import { createError, defineEventHandler, readBody, useRuntimeConfig, useSession } from 'nuxt/server'

interface LoginBody {
  password: string
}

export default defineEventHandler(async (event) => {
  const { password } = await readBody<LoginBody>(event)
  const { appPassword } = useRuntimeConfig()

  if (!appPassword || password !== appPassword) {
    throw createError({ status: 401, message: 'Wrong password' })
  }

  const session = await useSession<{ authed: boolean }>(event, {
    maxAge: 60 * 60 * 24,
    cookie: { sameSite: 'lax' },
  })
  await session.update({ authed: true })
})

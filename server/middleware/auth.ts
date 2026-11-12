import { createError, defineEventHandler, getRequestURL, getSession } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event)
  if (pathname.startsWith('/api/auth/')) {
    return
  }
  if (pathname.startsWith('/api/')) {
    const session = await getSession<{ authed?: boolean }>(event)
    if (!session.data.authed) {
      throw createError({ status: 401, message: 'Unauthorized' })
    }
  }
})

import { createError, defineEventHandler, getRequestURL, getSession } from 'nuxt/server'

// 除 /api/auth/ 外，所有 /api/ 请求都要有已解封且 authed 的 nuxt-session。
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

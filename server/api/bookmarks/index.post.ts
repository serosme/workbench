// `{ body }` 喂给 Nuxt 的路由类型生成器（前端据此校验 body），`, void` 是返回值——不写会退化成 any
export default defineEventHandler<{ body: CreateBookmarkInput }, void>(async (event) => {
  const body = await readBody<CreateBookmarkInput>(event)
  await createBookmark(body)
})

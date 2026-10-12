export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertBookmark, 'type' | 'name' | 'url' | 'parentId'>>(event)
  await createBookmark(body)
})

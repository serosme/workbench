export default defineEventHandler<{ body: CreateBookmarkInput }, void>(async (event) => {
  const body = await readValidatedBody(event, body => createBookmarkSchema.parse(body))
  await createBookmark(body)
})

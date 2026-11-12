import { eq } from 'drizzle-orm'

export default defineEventHandler<{ body: UpdateBookmarkInput }, void>(async (event) => {
  const id = getNumericId(event)
  const body = await readValidatedBody(event, body => updateBookmarkSchema.parse(body))
  await db.update(schema.bookmarks)
    .set({ name: body.name, url: body.url })
    .where(eq(schema.bookmarks.id, id))
    .run()
})

export default defineEventHandler(async () => {
  return await db.select().from(schema.bookmarks).orderBy(schema.bookmarks.parentId, schema.bookmarks.type, schema.bookmarks.position).all()
})

import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getNumericId(event)
  const bookmark = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.id, id)).get()
  if (!bookmark)
    throw createError({ status: 400, message: 'Not found' })
  if (bookmark.type === 'folder') {
    const children = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.parentId, id)).all()
    if (children.length > 0)
      throw createError({ status: 400, message: 'Folder is not empty' })
  }

  const { parentId, type } = bookmark
  const siblings = await db
    .select()
    .from(schema.bookmarks)
    .where(groupWhere(type, parentId))
    .orderBy(schema.bookmarks.position)
    .all()

  const remainingIds = siblings.filter(s => s.id !== id).map(s => s.id)
  await db.batch([
    db.delete(schema.bookmarks).where(eq(schema.bookmarks.id, id)),
    renumberGroupQuery(parentId, type, remainingIds),
  ])
})

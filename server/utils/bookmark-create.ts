import { eq, sql } from 'drizzle-orm'
import { createError } from 'nuxt/server'

export async function createBookmark(input: CreateBookmarkInput) {
  const { type, name, url = null, parentId = null } = input

  if (parentId !== null) {
    const parent = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.id, parentId)).get()
    if (parent?.type !== 'folder')
      throw createError({ status: 400, message: 'parentId must be an existing folder id' })
  }

  const row = await db
    .select({ max: sql<number>`coalesce(max(${schema.bookmarks.position}), 0)` })
    .from(schema.bookmarks)
    .where(groupWhere(type, parentId))
    .get()

  const [created] = await db.insert(schema.bookmarks)
    .values({ type, name, url, parentId, position: (row?.max ?? 0) + 1 })
    .returning()
  return created
}

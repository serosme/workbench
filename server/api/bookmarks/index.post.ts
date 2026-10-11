import { sql } from 'drizzle-orm'

// 新建位置由服务端算：目标 (parentId, type) 分组内 max(position) + 1，空分组为 1。
export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertBookmark, 'type' | 'name' | 'url' | 'parentId'>>(event)
  const { parentId, type } = body
  const row = await db
    .select({ max: sql<number>`coalesce(max(${schema.bookmarks.position}), 0)` })
    .from(schema.bookmarks)
    .where(groupWhere(type, parentId))
    .get()

  await db.insert(schema.bookmarks).values({
    type,
    name: body.name,
    url: body.url,
    parentId,
    position: (row?.max ?? 0) + 1,
  }).run()
})

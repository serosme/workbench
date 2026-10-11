export default defineEventHandler(async () => {
  // 按分组键 (parentId, type) + position 返回，使顺序自洽；客户端仍以 sortBookmarks 为准
  return await db.select().from(schema.bookmarks).orderBy(schema.bookmarks.parentId, schema.bookmarks.type, schema.bookmarks.position).all()
})

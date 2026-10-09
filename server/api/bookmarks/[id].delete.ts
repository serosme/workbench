import { db, schema } from '@nuxthub/db'
import { and, eq, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const bookmark = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.id, id)).get()
  if (!bookmark)
    throw createError({ status: 400, message: 'Not found' })
  if (bookmark.type === 'folder') {
    const children = await db.select().from(schema.bookmarks).where(eq(schema.bookmarks.parentId, id)).all()
    if (children.length > 0)
      throw createError({ status: 400, message: 'Folder is not empty' })
  }

  // 删除后把同组剩余项按当前顺序整段重编号为 1..n，维持「组内 position 连续」不变式，
  // 同时自愈历史数据可能存在的间隙与重复值。
  const { parentId, type } = bookmark
  const siblings = await db.select().from(schema.bookmarks).where(and(
    eq(schema.bookmarks.type, type),
    parentId === null ? isNull(schema.bookmarks.parentId) : eq(schema.bookmarks.parentId, parentId),
  )).orderBy(schema.bookmarks.position).all()

  const remainingIds = siblings.filter(s => s.id !== id).map(s => s.id)
  // remainingIds 为空时 json_each('[]') 匹配不到任何行，重编号语句是天然的空操作。
  await db.batch([
    db.delete(schema.bookmarks).where(eq(schema.bookmarks.id, id)),
    renumberGroupQuery(parentId, type, remainingIds),
  ])
})

import { and, eq, isNull, sql } from 'drizzle-orm'

export function groupWhere(type: 'folder' | 'bookmark', parentId: number | null | undefined) {
  return and(
    eq(schema.bookmarks.type, type),
    parentId == null
      ? isNull(schema.bookmarks.parentId)
      : eq(schema.bookmarks.parentId, parentId),
  )
}

export function renumberGroupQuery(
  parentId: number | null,
  type: 'folder' | 'bookmark',
  orderedIds: number[],
) {
  const idsJson = JSON.stringify(orderedIds)
  return db.update(schema.bookmarks)
    .set({
      position: sql`(select cast(je.key as integer) + 1 from json_each(${idsJson}) as je where cast(je.value as integer) = ${schema.bookmarks.id})`,
    })
    .where(and(
      groupWhere(type, parentId),
      sql`${schema.bookmarks.id} in (select cast(value as integer) from json_each(${idsJson}))`,
    ))
}

import { and, eq, isNull } from 'drizzle-orm'

/** 同一 `(parentId, type)` 分组的 SQL 条件（`parentId` 为空即根级）。 */
export function groupWhere(type: 'folder' | 'bookmark', parentId: number | null | undefined) {
  return and(
    eq(schema.bookmarks.type, type),
    parentId == null ? isNull(schema.bookmarks.parentId) : eq(schema.bookmarks.parentId, parentId),
  )
}

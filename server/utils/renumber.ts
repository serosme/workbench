import { and, sql } from 'drizzle-orm'

/**
 * 构造「把同一 (parentId, type) 分组的 position 按 orderedIds 顺序重写为 1..n」的更新语句。
 *
 * 刻意写成单条语句：语句数与绑定参数数都是常数（最多 4 个参数），不随分组大小增长，
 * 因此不会撞 D1 的「每批语句数」与「每查询绑定参数」限制（分组很大时尤为重要）。
 *
 * 顺序完全来自入参 JSON，不读表中既有的 position，故 UPDATE 的求值顺序不影响结果；
 * 调用方必须传入该分组的**完整** id 列表，否则漏掉的行不会被更新。
 */
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

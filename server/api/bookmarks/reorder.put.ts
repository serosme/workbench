// 调用方保证 ids 是该 (parentId, type) 分组的完整成员；不再做覆盖度校验。
// renumberGroupQuery 的 WHERE 已用 type / parentId / id in (...) 限定，越界或外来 id 只会更新 0 行。
export default defineEventHandler<{ body: ReorderBookmarksInput }, void>(async (event) => {
  const { parentId, type, ids } = await readValidatedBody(event, body => reorderBookmarksSchema.parse(body))
  await renumberGroupQuery(parentId, type, ids)
})

export default defineEventHandler<{ body: ReorderBookmarksInput }, void>(async (event) => {
  const { parentId, type, ids } = await readValidatedBody(event, body => reorderBookmarksSchema.parse(body))
  await renumberGroupQuery(parentId, type, ids)
})

import { eq } from 'drizzle-orm'

// candidate 是否落在 ancestorId 的子树里（顺着 parentId 往上走）。
function hasAncestor(list: Bookmark[], candidate: number, ancestorId: number): boolean {
  const parents = new Map(list.map(b => [b.id, b.parentId]))
  let current: number | null = candidate
  while (current !== null) {
    if (current === ancestorId)
      return true
    current = parents.get(current) ?? null
  }
  return false
}

// 跨父级移动：把一条记录挂到 parentId 下，并落到目标 (parentId, type) 分组的末尾。
// 源分组与目标分组各整段重编号，连同 parentId 更新放在同一个 db.batch 里；目标分组的重编号
// 写到最后，因此同一父级内移动（源与目标同组）也能得到正确顺序。
export default defineEventHandler<{ body: MoveBookmarkInput }, void>(async (event) => {
  const { id, parentId } = await readBody<MoveBookmarkInput>(event)
  if (parentId === id)
    throw createError({ status: 400, message: 'ParentId cannot be itself' })

  const all = await db.select().from(schema.bookmarks).all()
  const moving = all.find(b => b.id === id)
  if (!moving)
    throw createError({ status: 400, message: 'Not found' })
  // 文件夹移进自己的子孙会成环：buildTree 里这些行都成不了 root，整棵子树会从界面消失，
  // 且界面上再也点不到它们，只能改库才能恢复。
  if (moving.type === 'folder' && parentId !== null && hasAncestor(all, parentId, id))
    throw createError({ status: 400, message: 'Cannot move a folder into its own descendant' })

  // 分组内除被移动项以外的成员顺序（历史 position 可以有偏移与间隙，这里只比较大小）。
  const groupIds = (owner: number | null) => all
    .filter(b => b.type === moving.type && b.parentId === owner && b.id !== id)
    .sort((a, b) => a.position - b.position)
    .map(b => b.id)

  await db.batch([
    renumberGroupQuery(moving.parentId, moving.type, groupIds(moving.parentId)),
    db.update(schema.bookmarks).set({ parentId }).where(eq(schema.bookmarks.id, id)),
    renumberGroupQuery(parentId, moving.type, [...groupIds(parentId), id]),
  ])
})

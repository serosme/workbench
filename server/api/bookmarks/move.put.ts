import { eq } from 'drizzle-orm'

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

export default defineEventHandler<{ body: MoveBookmarkInput }, void>(async (event) => {
  const { id, parentId } = await readValidatedBody(event, body => moveBookmarkSchema.parse(body))
  if (parentId === id)
    throw createError({ status: 400, message: 'ParentId cannot be itself' })

  const all = await db.select().from(schema.bookmarks).all()
  const moving = all.find(b => b.id === id)
  if (!moving)
    throw createError({ status: 400, message: 'Not found' })
  if (parentId !== null) {
    const parent = all.find(b => b.id === parentId)
    if (parent?.type !== 'folder')
      throw createError({ status: 400, message: 'parentId must be an existing folder id' })
  }
  if (moving.type === 'folder' && parentId !== null && hasAncestor(all, parentId, id))
    throw createError({ status: 400, message: 'Cannot move a folder into its own descendant' })

  const groupIds = (owner: number | null) => all
    .filter(b => b.type === moving.type && b.parentId === owner && b.id !== id)
    .sort((a, b) => a.position - b.position)
    .map(b => b.id)

  await db.batch([
    renumberGroupQuery(moving.parentId, moving.type, groupIds(moving.parentId)),
    db.update(schema.bookmarks).set({ parentId }).where(eq(schema.bookmarks.id, id)),
    renumberGroupQuery(parentId, moving.type, [
      ...groupIds(parentId),
      id,
    ]),
  ])
})

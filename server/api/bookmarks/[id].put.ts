import { eq } from 'drizzle-orm'

// 编辑只改展示字段：type / parentId / position 属结构性字段，分别由创建、move、reorder 路径负责，
// 若在此处一并写入，会绕过对应分组的重编号、破坏组内 position 不变式。
export default defineEventHandler<{ body: UpdateBookmarkInput }, void>(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<UpdateBookmarkInput>(event)
  await db.update(schema.bookmarks)
    .set({ name: body.name, url: body.url })
    .where(eq(schema.bookmarks.id, id))
    .run()
})

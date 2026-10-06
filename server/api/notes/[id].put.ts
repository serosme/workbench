import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Pick<InsertNote, 'content'>>(event)
  // 只改内容：createdAt 保持首次记录的时间，编辑不会让卡片在瀑布流里跳位置
  await db.update(schema.notes)
    .set({ content: body.content })
    .where(eq(schema.notes.id, id))
    .run()
})

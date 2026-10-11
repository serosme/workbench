import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<Pick<InsertNote, 'title' | 'content' | 'writtenAt'>>(event)
  // 标题、正文、书写日期都可改（补记/改日期）
  await db.update(schema.notes)
    .set({ title: body.title, content: body.content, writtenAt: body.writtenAt })
    .where(eq(schema.notes.id, id))
    .run()
})

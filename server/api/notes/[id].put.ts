import { eq } from 'drizzle-orm'

export default defineEventHandler<{ body: SaveNoteInput }, void>(async (event) => {
  const id = getNumericId(event)
  const body = await readValidatedBody(event, body => saveNoteSchema.parse(body))
  // 标题、正文、书写日期都可改（补记/改日期）
  await db.update(schema.notes)
    .set({ title: body.title, content: body.content, writtenAt: body.writtenAt })
    .where(eq(schema.notes.id, id))
    .run()
})

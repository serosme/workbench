import { db, schema } from '@nuxthub/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertNote, 'content'>>(event)
  await db.insert(schema.notes).values({
    content: body.content,
    createdAt: Date.now(),
  }).run()
})

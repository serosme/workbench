import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return await db.select().from(schema.notes).orderBy(desc(schema.notes.writtenAt), desc(schema.notes.id)).all()
})

import { db, schema } from '@nuxthub/db'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return await db.select().from(schema.notes).orderBy(desc(schema.notes.createdAt), desc(schema.notes.id)).all()
})

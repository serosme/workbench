import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getNumericId(event)
  await db.delete(schema.notes).where(eq(schema.notes.id, id)).run()
})

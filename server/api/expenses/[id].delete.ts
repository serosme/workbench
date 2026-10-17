import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = getNumericId(event)
  await db.delete(schema.expenses).where(eq(schema.expenses.id, id)).run()
})

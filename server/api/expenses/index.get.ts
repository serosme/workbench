import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  return await db.select().from(schema.expenses).orderBy(desc(schema.expenses.spentAt), desc(schema.expenses.id)).all()
})

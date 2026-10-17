import { eq } from 'drizzle-orm'

export default defineEventHandler<{ body: SaveExpenseInput }, void>(async (event) => {
  const id = getNumericId(event)
  const body = await readValidatedBody(event, body => saveExpenseSchema.parse(body))
  await db.update(schema.expenses)
    .set({ item: body.item, amount: body.amount, spentAt: body.spentAt })
    .where(eq(schema.expenses.id, id))
    .run()
})

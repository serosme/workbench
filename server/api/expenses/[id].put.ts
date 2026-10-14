import { eq } from 'drizzle-orm'

export default defineEventHandler<{ body: SaveExpenseInput }, void>(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody<SaveExpenseInput>(event)
  await db.update(schema.expenses)
    .set({ item: body.item, amount: body.amount, spentAt: body.spentAt })
    .where(eq(schema.expenses.id, id))
    .run()
})

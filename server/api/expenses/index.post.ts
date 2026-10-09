import { db, schema } from '@nuxthub/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertExpense, 'item' | 'amount' | 'spentAt'>>(event)
  await db.insert(schema.expenses).values({
    item: body.item,
    amount: body.amount,
    spentAt: body.spentAt,
  }).run()
})

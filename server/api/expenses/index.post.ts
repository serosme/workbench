export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertExpense, 'item' | 'amount' | 'spentAt'>>(event)
  await createExpense(body)
})

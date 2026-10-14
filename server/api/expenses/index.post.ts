export default defineEventHandler<{ body: SaveExpenseInput }, void>(async (event) => {
  const body = await readBody<SaveExpenseInput>(event)
  await createExpense(body)
})

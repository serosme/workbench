export default defineEventHandler<{ body: SaveExpenseInput }, void>(async (event) => {
  const body = await readValidatedBody(event, body => saveExpenseSchema.parse(body))
  await createExpense(body)
})

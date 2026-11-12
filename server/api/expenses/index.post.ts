export default defineEventHandler<{ body: SaveExpenseInput }, void>(async (event) => {
  const body = await readValidatedBody(event, body => saveExpenseSchema.parse(body))
  await db.insert(schema.expenses).values(body).run()
})

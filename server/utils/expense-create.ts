export async function createExpense(input: SaveExpenseInput) {
  const [created] = await db.insert(schema.expenses).values(input).returning()
  return created
}

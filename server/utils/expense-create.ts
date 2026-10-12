export async function createExpense(input: Pick<InsertExpense, 'item' | 'amount' | 'spentAt'>) {
  const [created] = await db.insert(schema.expenses).values(input).returning()
  return created
}

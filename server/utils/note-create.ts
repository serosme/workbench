export async function createNote(input: Pick<InsertNote, 'title' | 'content' | 'writtenAt'>) {
  const [created] = await db.insert(schema.notes).values(input).returning()
  return created
}

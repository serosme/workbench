export async function createNote(input: SaveNoteInput) {
  const [created] = await db.insert(schema.notes).values(input).returning()
  return created
}

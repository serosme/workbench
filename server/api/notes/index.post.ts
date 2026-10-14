export default defineEventHandler<{ body: SaveNoteInput }, void>(async (event) => {
  const body = await readBody<SaveNoteInput>(event)
  await createNote(body)
})

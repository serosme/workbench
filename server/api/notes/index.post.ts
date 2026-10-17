export default defineEventHandler<{ body: SaveNoteInput }, void>(async (event) => {
  const body = await readValidatedBody(event, body => saveNoteSchema.parse(body))
  await createNote(body)
})

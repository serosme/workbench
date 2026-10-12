export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertNote, 'title' | 'content' | 'writtenAt'>>(event)
  await createNote(body)
})

export default defineEventHandler(async () => {
  return buildFileTree(await listBlobs(''))
})

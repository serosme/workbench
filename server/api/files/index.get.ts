export default defineEventHandler(async () => {
  return (await listBlobs('')).map(({ pathname, size, contentType }) => ({ pathname, size, contentType }))
})

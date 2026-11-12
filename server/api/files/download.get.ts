export default defineEventHandler(async (event) => {
  const { pathname } = await getValidatedQuery(event, query => filePathnameQuerySchema.parse(query))

  const filename = pathname.split('/').pop()!.replace(/["\r\n]/g, '_')
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_')
  setHeader(event, 'Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`)

  const { size } = await blob.head(pathname)
  if (size && size > MAX_DOWNLOAD_BYTES)
    throw createError({ status: 413, message: `File is too large to download (max ${formatBytes(MAX_DOWNLOAD_BYTES)})` })

  return blob.serve(event, pathname)
})

function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  catch {
    return new TextDecoder('gb18030').decode(bytes)
  }
}

export default defineEventHandler(async (event) => {
  const { pathname } = await getValidatedQuery(event, query => filePathnameQuerySchema.parse(query))

  const file = await blob.get(pathname)
  if (!file)
    throw createError({ status: 400, message: 'File not found' })

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.subarray(0, 8192).includes(0))
    throw createError({ status: 415, message: 'Not a text file' })

  return {
    content: decodeText(bytes),
  }
})

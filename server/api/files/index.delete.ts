export default defineEventHandler(async (event) => {
  const { pathname } = await getValidatedQuery(event, query => filePathnameQuerySchema.parse(query))

  await blob.del(pathname.endsWith('/') ? (await listBlobs(pathname)).map(item => item.pathname) : pathname)
})

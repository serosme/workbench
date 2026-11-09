// 只回扁平列表、树在客户端建（与 GET /api/bookmarks 一致）：服务端不持有视图模型，size 只用于下载前判断
export default defineEventHandler(async () => {
  return (await listBlobs('')).map(({ pathname, size }) => ({ pathname, size }))
})

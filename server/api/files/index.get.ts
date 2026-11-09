// 只回扁平列表、树在客户端建（与 GET /api/bookmarks 一致）：服务端不持有视图模型，
// size 用于下载前判断，contentType 用于文件树决定给不给 Preview
export default defineEventHandler(async () => {
  return (await listBlobs('')).map(({ pathname, size, contentType }) => ({ pathname, size, contentType }))
})

// 单个下载请求会把整份文件读进内存（NuxtHub 的读接口都是整份读，driver 没有流式接口），
// 线上受 Workers 128MB isolate 上限约束，所以留出余量、超过就明确报 413 而不是让它报 1102。
// 本地也一样受限——为了本地和线上行为一致。
const MAX_SIZE = 64 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const path = String(getQuery(event).path ?? '')
  if (!path)
    throw createError({ status: 400, message: 'File path is required' })

  // 头值只能是 latin1：中文名直接塞进 filename= 会让 Node / Workers 的头校验抛错（ERR_INVALID_CHAR → 500），
  // 所以 ASCII 回退一份、再用 RFC 5987 的 filename* 带真正的名字
  const filename = path.split('/').pop()!.replace(/["\r\n]/g, '_')
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_')
  setHeader(event, 'Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`)

  const { size } = await blob.head(path) // 文件不存在时 head 自己抛 404
  if (size && size > MAX_SIZE)
    throw createError({ status: 413, message: `File is too large to download (max ${MAX_SIZE / 1024 / 1024}MB)` })

  // serve 把内容读成 ArrayBuffer 后直接包成 ReadableStream 返回，不会被 h3 再复制一份（峰值约 1× 文件大小）
  return blob.serve(event, path)
})

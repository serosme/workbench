// 文本预览：blob.get 只能整份读（driver 没有 range 接口），所以不设大小上限——个人自用，
// 超大文件撞 Workers 128MB isolate 上限时直接失败，由 selfFetch 弹错误 toast，不做预检。
// 判断「是不是文本」只能看内容、不能看 MIME：driver 对推不出类型的文件一律给 application/octet-stream，
// 靠解码结果比靠类型可靠。MIME 只在前端菜单里用来藏掉明显二进制的项（见 useFileMenu 的 BINARY_TYPE）。
function decodeText(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  catch {
    // 中文环境的老文件常是 GBK：UTF-8 严格解码失败时按 GB18030 兜底（浏览器与 Workers 都原生支持）
    return new TextDecoder('gb18030').decode(bytes)
  }
}

export default defineEventHandler(async (event) => {
  const { path } = await getValidatedQuery(event, query => filePathQuerySchema.parse(query))

  const file = await blob.get(path)
  if (!file)
    throw createError({ status: 404, message: 'File not found' })

  const bytes = new Uint8Array(await file.arrayBuffer())
  // 前 8KB 出现 NUL 字节基本可以断定是二进制（图片 / 压缩包），显示出来只有乱码
  if (bytes.subarray(0, 8192).includes(0))
    throw createError({ status: 415, message: 'Not a text file' })

  return { content: decodeText(bytes) }
})

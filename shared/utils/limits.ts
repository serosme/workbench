// 下载上限：`blob.serve` 会把整份文件读进内存（Workers 128MB isolate），所以服务端必须拦，
// 客户端也用同一个值在点下载前先提示，避免浏览器打开一段 413 JSON。
// 96MB 是贴着 128MB 上限留的余量，再大就开始赌 isolate 里还有没有别的请求。
export const MAX_DOWNLOAD_BYTES = 96 * 1024 * 1024

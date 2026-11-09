// 大文件分片上传：客户端 useMultipartUpload 会按 /create /upload /complete /abort 调过来。
// 分片是按片缓冲的（一片 partSize，默认 10MB），所以不受 Workers 128MB 内存上限和单请求 100MB 体积上限的约束
export default eventHandler(event => blob.handleMultipartUpload(event))

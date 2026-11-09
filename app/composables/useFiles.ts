const PART_SIZE = 10 * 1024 * 1024

export function useFiles() {
  const toast = useToast()
  const { data, error, refresh } = useSelfFetch('/api/files')

  // 两栏要一起出现，所以页面等这个请求落地；但“落地”只看 data 会在接口挂掉时让整页永远空白，
  // 所以 error 也算落地（selfFetch 已弹 toast，右栏留空即可）。
  // 写成锁而不是直接看 status：上传成功后的 refresh 会把 status 短暂置回 pending，那会把整页收起来。
  const ready = computed(() => data.value !== undefined || error.value !== undefined)
  const tree = computed(() => buildFileTree(data.value ?? []))

  // key 形如 `documents/photos/a.png`：最后一段是文件名，前面是目录，目录通过 prefix 交给分片上传的 create
  const upload = async (key: string, file: File) => {
    const prefix = key.split('/').slice(0, -1).join('/')

    const multipart = useMultipartUpload('/api/files/multipart', {
      partSize: PART_SIZE,
      // 本地与线上统一串行，避免 fs driver 的分片状态并发读改写问题，并保持上传参数一致。
      // 注意：服务端每片都要整片缓冲进内存，单个上传请求最多缓冲一个 10MB 分片。
      concurrent: 1,
      prefix,
    })

    const { completed } = multipart(file)

    try {
      // 库在重试耗尽后是 catch 后直接 return，completed 只会 resolve（成功是 complete 的返回值，失败是 undefined），
      // 所以必须判空抛错：否则上传失败会被当成成功，弹窗照常关闭并 refresh
      if (!await completed)
        throw new Error('Upload failed')
    }
    catch (error) {
      // 分片上传用的是库自带的 ofetch，不走 selfFetch，失败不会进全局错误 toast（否则就是静默失败）；
      // 这里显式报一次再抛出，弹窗靠 reject 保持打开、submitting 由 finally 复位。
      toast.add({ color: 'error', title: 'Upload failed' })
      throw error
    }
  }

  return {
    tree,
    ready,
    upload,
    refresh,
  }
}

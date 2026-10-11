const PART_SIZE = 10 * 1024 * 1024

export function useFiles() {
  const { data, refresh } = useSelfFetch<FileTreeNode[]>('/api/files/tree', {
    default: () => [],
  })

  // key 形如 `documents/photos/a.png`：最后一段是文件名，前面是目录，目录通过 prefix 交给分片上传的 create
  const upload = async (key: string, file: File, onProgress?: (percent: number) => void) => {
    const prefix = key.split('/').slice(0, -1).join('/')

    const multipart = useMultipartUpload('/api/files/multipart', {
      partSize: PART_SIZE,
      // 本地与线上统一串行，避免 fs driver 的分片状态并发读改写问题，并保持上传参数一致。
      // 注意：服务端每片都要整片缓冲进内存，单个上传请求最多缓冲一个 10MB 分片。
      concurrent: 1,
      prefix,
    })

    const chunks = Math.max(1, Math.ceil(file.size / PART_SIZE))
    const { completed, progress } = multipart(file)
    // 库上报的是「已完成片数 / 总片数」，而且是先赋值再 push（滞后一片）：按片数换算成正在传的这一片，
    // 否则小于一片的文件全程 0%、多片文件最多停在 (n-1)/n
    const stopProgress = watch(progress, (percent) => {
      const part = Math.floor(percent / 100 * chunks) + 1
      onProgress?.(Math.round(part / chunks * 100))
    })

    try {
      // 库在重试耗尽后是 catch 后直接 return，completed 只会 resolve（成功是 complete 的返回值，失败是 undefined），
      // 所以必须判空抛错：否则上传失败会被当成成功，弹窗照常关闭并 refresh
      if (!await completed)
        throw new Error('Upload failed')
    }
    finally {
      // watch 建在事件处理器的调用栈里（不在 setup 作用域），不会随组件销毁自动停止，用完手动停
      stopProgress()
    }
  }

  return {
    tree: data,
    upload,
    refresh,
  }
}

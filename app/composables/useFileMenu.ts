import type { DropdownMenuItem } from '@nuxt/ui'

// 只有明显是二进制的类型才不给 Preview：压缩包 / 图片 / 音视频点开必然吃 415（服务端靠前 8KB 的 NUL 字节判定）。
// 放行 `application/octet-stream` 是刻意的：`.env` / `Makefile` 这类按扩展名推不出类型的，driver 一律给 octet-stream，
// 它们其实是纯文本；反过来的 `.bin` 之类会落到 415，交给服务端兜底。
const BINARY_TYPE = /^(?:image|video|audio|font)\/|^application\/(?:pdf|zip|x-zip-compressed|gzip|x-gzip|x-tar|x-7z-compressed|x-rar-compressed|x-bzip2|wasm|vnd\.)/

export function useFileMenu(
  uploadForm: ReturnType<typeof useFileUploadForm>,
  preview: ReturnType<typeof useFilePreview>,
  remove: (path: string, type: FileTreeNode['type']) => Promise<void>,
) {
  const toast = useToast()

  function download(node: FileTreeNode) {
    // 服务端同样会拦 413，这里先提示是为了不让浏览器打开一段 JSON 错误
    if (node.size && node.size > MAX_DOWNLOAD_BYTES) {
      toast.add({ color: 'error', title: 'File is too large to download', description: `Max ${formatBytes(MAX_DOWNLOAD_BYTES)}` })
      return
    }

    const link = document.createElement('a')
    link.href = `/api/files/download?path=${encodeURIComponent(node.key)}`
    link.download = node.label
    link.click()
  }

  function getMenu(node?: FileTreeNode): DropdownMenuItem[][] {
    if (node?.type === 'folder') {
      return [
        [
          {
            label: 'Upload File',
            icon: 'i-lucide-upload',
            onSelect() { uploadForm.open(node.key) },
          },
        ],
        [
          {
            label: 'Delete Folder',
            icon: 'i-lucide-trash-2',
            color: 'error',
            onSelect() { remove(node.key, node.type) },
          },
        ],
      ]
    }

    if (node?.type === 'file') {
      const items: DropdownMenuItem[] = []
      if (!BINARY_TYPE.test(node.contentType ?? '')) {
        items.push({
          label: 'Preview',
          icon: 'i-lucide-eye',
          onSelect() { preview.open(node) },
        })
      }
      items.push({
        label: 'Download File',
        icon: 'i-lucide-download',
        onSelect() { download(node) },
      })

      return [
        items,
        [
          {
            label: 'Delete File',
            icon: 'i-lucide-trash-2',
            color: 'error',
            onSelect() { remove(node.key, node.type) },
          },
        ],
      ]
    }

    return [[
      {
        label: 'Upload File',
        icon: 'i-lucide-upload',
        onSelect() { uploadForm.open() },
      },
    ]]
  }

  return { getMenu }
}

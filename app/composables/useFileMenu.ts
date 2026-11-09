import type { DropdownMenuItem } from '@nuxt/ui'

export function useFileMenu(
  uploadForm: ReturnType<typeof useFileUploadForm>,
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
      return [
        [
          {
            label: 'Download File',
            icon: 'i-lucide-download',
            onSelect() { download(node) },
          },
        ],
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

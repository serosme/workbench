import type { DropdownMenuItem } from '@nuxt/ui'

const BINARY_TYPE = /^(?:image|video|audio|font)\/|^application\/(?:pdf|zip|x-zip-compressed|gzip|x-gzip|x-tar|x-7z-compressed|x-rar-compressed|x-bzip2|wasm|vnd\.)/

export function useFileMenu({ uploadForm, preview, remove }: {
  uploadForm: ReturnType<typeof useFileUploadForm>
  preview: ReturnType<typeof useFilePreview>
  remove: (pathname: string, type: FileTreeNode['type']) => Promise<unknown>
}) {
  const toast = useToast()

  function download(node: FileTreeNode) {
    if (node.size && node.size > MAX_DOWNLOAD_BYTES) {
      toast.add({ color: 'error', title: 'File is too large to download', description: `Max ${formatBytes(MAX_DOWNLOAD_BYTES)}` })
      return
    }

    const link = document.createElement('a')
    link.href = `/api/files/download?pathname=${encodeURIComponent(node.pathname)}`
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
            onSelect() { uploadForm.open(node.pathname) },
          },
        ],
        [
          {
            label: 'Delete Folder',
            icon: 'i-lucide-trash-2',
            color: 'error',
            onSelect() { remove(node.pathname, node.type) },
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
            onSelect() { remove(node.pathname, node.type) },
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

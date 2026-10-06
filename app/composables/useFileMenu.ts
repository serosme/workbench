import type { DropdownMenuItem } from '@nuxt/ui'
import type { FileTreeNode } from '#shared/types/files'

export function useFileMenu(
  uploadForm: ReturnType<typeof useFileUploadForm>,
  remove: (path: string) => Promise<void>,
) {
  function download(node: FileTreeNode) {
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
            icon: 'i-lucide-trash',
            onSelect() { remove(node.key) },
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
            icon: 'i-lucide-trash',
            onSelect() { remove(node.key) },
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

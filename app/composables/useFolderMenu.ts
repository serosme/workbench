import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import { menuBookmark, moveMenuItem } from '~/utils/bookmark-menu'

export function useFolderMenu(
  bookmarkForm: ReturnType<typeof useBookmarkForm>,
  folderForm: ReturnType<typeof useFolderForm>,
  moveForm: ReturnType<typeof useMoveForm>,
  remove: (id: number) => Promise<void>,
  reorder: ReturnType<typeof useReorderBookmarks>,
) {
  function getMenu(item: TreeItem): DropdownMenuItem[][] {
    const b = menuBookmark(item)
    return [
      [
        {
          label: 'New Folder',
          icon: 'i-lucide-folder-plus',
          onSelect() { folderForm.openCreate(b.id) },
        },
        {
          label: 'New Bookmark',
          icon: 'i-lucide-bookmark-plus',
          onSelect() { bookmarkForm.openCreate(b.id) },
        },
      ],
      [moveMenuItem(b, reorder, moveForm)],
      [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { folderForm.openEdit(b) },
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash-2',
          color: 'error',
          onSelect() { remove(b.id) },
        },
      ],
    ]
  }

  return { getMenu }
}

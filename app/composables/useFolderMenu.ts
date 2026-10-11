import type { DropdownMenuItem } from '@nuxt/ui'

export function useFolderMenu(
  bookmarkForm: ReturnType<typeof useBookmarkForm>,
  folderForm: ReturnType<typeof useBookmarkForm>,
  moveForm: ReturnType<typeof useMoveForm>,
  remove: (id: number) => Promise<void>,
  reorder: ReturnType<typeof useReorderBookmarks>,
) {
  function getMenu(b: Bookmark): DropdownMenuItem[][] {
    // 所有非删除项放上面一组；Delete 单独放最下一组（菜单分节统一约定，见 AGENTS.md）
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
        moveMenuItem(b, reorder, moveForm),
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { folderForm.openEdit(b) },
        },
      ],
      [
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

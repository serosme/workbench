import type { DropdownMenuItem } from '@nuxt/ui'

export function useBookmarkFolderMenu(
  { bookmarkForm, folderForm, moveForm, bookmarkMove, remove }:
  BookmarkMenuDeps & { folderForm: ReturnType<typeof useBookmarkForm> },
) {
  function getMenu(b: Bookmark): DropdownMenuItem[][] {
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
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { folderForm.openEdit(b) },
        },
        moveMenuItem(b, {
          canMove: bookmarkMove.canMove,
          move: bookmarkMove.move,
          moving: bookmarkMove.moving.value,
          openMove: moveForm.openMove,
        }),
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

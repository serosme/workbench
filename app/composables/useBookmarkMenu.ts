import type { DropdownMenuItem } from '@nuxt/ui'

export interface BookmarkMenuDeps {
  bookmarkForm: ReturnType<typeof useBookmarkForm>
  moveForm: ReturnType<typeof useMoveForm>
  bookmarkMove: ReturnType<typeof useBookmarkMove>
  remove: (id: number) => Promise<unknown>
}

export function useBookmarkMenu({ bookmarkForm, moveForm, bookmarkMove, remove }: BookmarkMenuDeps) {
  function getMenu(b: Bookmark): DropdownMenuItem[][] {
    const actions: DropdownMenuItem[] = [
      {
        label: 'Edit',
        icon: 'i-lucide-pencil',
        onSelect() { bookmarkForm.openEdit(b) },
      },
      moveMenuItem(b, {
        canMove: bookmarkMove.canMove,
        move: bookmarkMove.move,
        moving: bookmarkMove.moving.value,
        openMove: moveForm.openMove,
      }),
    ]

    return [
      actions,
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

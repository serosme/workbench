import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'
import { menuBookmark, moveMenuItem } from '~/utils/bookmark-menu'

export function useBookmarkMenu(
  bookmarkForm: ReturnType<typeof useBookmarkForm>,
  moveForm: ReturnType<typeof useMoveForm>,
  remove: (id: number) => Promise<void>,
  reorder: ReturnType<typeof useReorderBookmarks>,
) {
  function getMenu(item: TreeItem): DropdownMenuItem[][] {
    const b = menuBookmark(item)
    const items: DropdownMenuItem[][] = [
      [moveMenuItem(b, reorder, moveForm)],
      [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { bookmarkForm.openEdit(b) },
        },
        {
          label: 'Delete',
          icon: 'i-lucide-trash-2',
          color: 'error',
          onSelect() { remove(b.id) },
        },
      ],
    ]
    const url = b.url
    if (url) {
      items.unshift([
        {
          label: 'Open in New Tab',
          icon: 'i-lucide-external-link',
          onSelect() { navigateTo(url, { external: true, open: { target: '_blank' } }) },
        },
      ])
    }
    return items
  }

  return { getMenu }
}

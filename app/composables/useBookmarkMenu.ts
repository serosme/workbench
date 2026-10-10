import type { DropdownMenuItem } from '@nuxt/ui'
import { moveMenuItem } from '~/utils/bookmark-menu'

export function useBookmarkMenu(
  bookmarkForm: ReturnType<typeof useBookmarkForm>,
  moveForm: ReturnType<typeof useMoveForm>,
  remove: (id: number) => Promise<void>,
  reorder: ReturnType<typeof useReorderBookmarks>,
) {
  function getMenu(b: Bookmark): DropdownMenuItem[][] {
    // 所有非删除项放上面一组；Delete 单独放最下一组（菜单分节统一约定，见 AGENTS.md）
    const actions: DropdownMenuItem[] = []

    const url = b.url
    if (url) {
      actions.push({
        label: 'Open in New Tab',
        icon: 'i-lucide-external-link',
        onSelect() { navigateTo(url, { external: true, open: { target: '_blank' } }) },
      })
    }
    actions.push(moveMenuItem(b, reorder, moveForm))
    actions.push({
      label: 'Edit',
      icon: 'i-lucide-pencil',
      onSelect() { bookmarkForm.openEdit(b) },
    })

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

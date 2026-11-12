import type { TreeItem } from '@nuxt/ui'

function toTreeItem(b: Bookmark) {
  return {
    id: b.id,
    parentId: b.parentId,
    label: b.name,
    icon: b.type === 'folder'
      ? 'i-lucide-folder'
      : 'i-lucide-bookmark',
    onSelect: b.type === 'bookmark' && b.url
      ? () => navigateTo(b.url!, {
          open: { target: '_blank' },
        })
      : undefined,
  }
}

export function useBookmarks() {
  const { data, refresh } = useApiFetch('/api/bookmarks')

  const tree = computed<TreeItem[]>(() => buildTree(sortBookmarks(data.value ?? []).map(toTreeItem)))

  return {
    bookmarks: data,
    tree,
    refresh,
  }
}

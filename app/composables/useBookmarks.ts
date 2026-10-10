import type { TreeItem } from '@nuxt/ui'
import { buildTree, sortBookmarks } from '~/utils/bookmark-tree'

function toTreeItem(b: Bookmark) {
  return {
    id: b.id,
    parentId: b.parentId,
    label: b.name,
    icon: b.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-bookmark',
    onSelect: b.type === 'bookmark' && b.url
      ? () => navigateTo(b.url!, { external: true })
      : undefined,
  }
}

export function useBookmarks() {
  const { data, refresh } = useSelfFetch<Bookmark[]>('/api/bookmarks')

  // 单树：文件夹在上（各带子书签），根级书签按 position 落在最下边
  const tree = computed<TreeItem[]>(() => buildTree(sortBookmarks(data.value ?? []).map(toTreeItem)))

  return {
    tree,
    data,
    refresh,
  }
}

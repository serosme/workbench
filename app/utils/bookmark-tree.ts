export function sortBookmarks<T extends { parentId: number | null, type: string, position: number }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const pa = a.parentId ?? -1
    const pb = b.parentId ?? -1
    if (pa !== pb)
      return pa - pb
    if (a.type !== b.type)
      return a.type === 'folder' ? -1 : 1
    return a.position - b.position
  })
}

export function buildTree<T extends { id: string | number, parentId: string | number | null }>(list: T[]): (T & { children: T[] })[] {
  const map = new Map<string | number, T & { children: T[] }>()
  for (const item of list)
    map.set(item.id, { ...item, children: [] })

  const roots: (T & { children: T[] })[] = []
  for (const item of list) {
    const node = map.get(item.id)!
    if (item.parentId != null) {
      const parent = map.get(item.parentId)
      if (parent) {
        parent.children.push(node)
        continue
      }
    }
    roots.push(node)
  }

  return roots
}

export interface BookmarkFolderNode {
  id: number
  name: string
  children: BookmarkFolderNode[]
}

export function buildBookmarkFolderTree<
  T extends { id: number, parentId: number | null, type: string, name: string, position: number },
>(list: T[], moving?: { id: number, type: string }): BookmarkFolderNode[] {
  const excludedId = moving?.type === 'folder' ? moving.id : undefined
  const folders = sortBookmarks(list.filter(b => b.type === 'folder' && b.id !== excludedId))

  function childrenOf(parentId: number | null): BookmarkFolderNode[] {
    return folders
      .filter(b => b.parentId === parentId)
      .map(b => ({ id: b.id, name: b.name, children: childrenOf(b.id) }))
  }

  return childrenOf(null)
}

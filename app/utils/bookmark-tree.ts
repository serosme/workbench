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

export function buildTree<T extends { id: string | number | undefined, parentId: string | number | null | undefined }>(list: T[]): (T & { children: T[] })[] {
  if (list.length === 0)
    return []

  const map = new Map<string | number, T & { children: T[] }>()
  for (const item of list) {
    if (item.id == null)
      continue
    map.set(item.id, { ...item, children: [] })
  }

  const roots: (T & { children: T[] })[] = []
  for (const item of list) {
    if (item.id == null)
      continue
    const node = map.get(item.id)
    if (!node)
      continue
    if (item.parentId == null || !map.has(item.parentId))
      roots.push(node)
    else
      map.get(item.parentId)!.children.push(node)
  }

  return roots
}

export interface FolderNode {
  id: number
  name: string
  children: FolderNode[]
}

/**
 * 「移动到」弹窗里可选的文件夹树：只含文件夹、按层级嵌套、同级按 position 排。
 *
 * moving 是即将被移动的那条记录：移动文件夹时只剪掉它自己就够——它的子孙只会从被保留的节点往下递归，
 * 自然进不来。不剪则会成环：buildTree 里成环的行都成不了 root，整棵子树从界面消失且再也点不到。
 */
export function buildFolderTree<
  T extends { id: number, parentId: number | null, type: string, name: string, position: number },
>(list: T[], moving?: { id: number, type: string }): FolderNode[] {
  const excludedId = moving?.type === 'folder' ? moving.id : undefined
  const folders = sortBookmarks(list.filter(b => b.type === 'folder' && b.id !== excludedId))

  function childrenOf(parentId: number | null): FolderNode[] {
    return folders
      .filter(b => b.parentId === parentId)
      .map(b => ({ id: b.id, name: b.name, children: childrenOf(b.id) }))
  }

  return childrenOf(null)
}

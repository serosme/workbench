import type { BlobObject } from '@nuxthub/core/blob'

export function buildFileTree(objects: BlobObject[]): FileTreeNode[] {
  const roots: FileTreeNode[] = []

  for (const object of objects) {
    const parts = object.pathname.split('/').filter(Boolean)
    if (!parts.length)
      continue

    let children = roots
    let path = ''
    parts.forEach((part, index) => {
      path += `${part}/`
      const isFile = index === parts.length - 1
      const key = isFile ? object.pathname : path
      let node = children.find(item => item.key === key)
      if (!node) {
        node = isFile
          ? { id: key, label: part, type: 'file', key }
          : { id: key, label: part, type: 'folder', key, children: [] }
        children.push(node)
      }
      if (!isFile)
        children = node.children!
    })
  }

  function sort(nodes: FileTreeNode[]) {
    nodes.sort((a, b) => a.type === b.type ? a.label.localeCompare(b.label) : a.type === 'folder' ? -1 : 1)
    for (const node of nodes) {
      if (node.children)
        sort(node.children)
    }
  }
  sort(roots)
  return roots
}

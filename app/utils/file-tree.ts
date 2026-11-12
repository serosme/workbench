export interface FileTreeNode {
  label: string
  pathname: string
  type: 'folder' | 'file'
  size?: number
  contentType?: string
  children?: FileTreeNode[]
}

export function buildFileTree(objects: { pathname: string, size?: number, contentType?: string }[]): FileTreeNode[] {
  const roots: FileTreeNode[] = []

  for (const { pathname, size, contentType } of objects) {
    const parts = pathname.split('/').filter(Boolean)
    if (!parts.length)
      continue

    let children = roots
    let prefix = ''
    parts.forEach((part, index) => {
      prefix += `${part}/`
      const isFile = index === parts.length - 1
      const nodePathname = isFile ? pathname : prefix
      let node = children.find(item => item.pathname === nodePathname)
      if (!node) {
        node = isFile
          ? { label: part, pathname: nodePathname, type: 'file', size, contentType }
          : { label: part, pathname: nodePathname, type: 'folder', children: [] }
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

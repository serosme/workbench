export interface FileTreeNode {
  label: string
  key: string
  type: 'folder' | 'file'
  size?: number
  contentType?: string
  children?: FileTreeNode[]
}

// 服务端只回 pathname 列表，树在客户端建（与书签那边一致）。key 同时是节点的唯一标识与删除/下载用的路径：
// 文件夹 key 以 / 结尾，文件 key 是完整 pathname。
export function buildFileTree(objects: { pathname: string, size?: number, contentType?: string }[]): FileTreeNode[] {
  const roots: FileTreeNode[] = []

  for (const { pathname, size, contentType } of objects) {
    const parts = pathname.split('/').filter(Boolean)
    if (!parts.length)
      continue

    let children = roots
    let path = ''
    parts.forEach((part, index) => {
      path += `${part}/`
      const isFile = index === parts.length - 1
      const key = isFile ? pathname : path
      let node = children.find(item => item.key === key)
      if (!node) {
        node = isFile
          ? { label: part, key, type: 'file', size, contentType }
          : { label: part, key, type: 'folder', children: [] }
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

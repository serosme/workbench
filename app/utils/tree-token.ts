import type { TreeItem } from '@nuxt/ui'

export function withNodeTokens<T extends { children?: T[] }>(
  items: T[],
  toTreeItem: (node: T, tokenClass: string) => TreeItem,
): { items: TreeItem[], nodes: Map<string, T> } {
  const nodes = new Map<string, T>()
  let token = 0

  const walk = (list: T[]): TreeItem[] => list.map((node) => {
    const tokenClass = `tree-node-${token++}`
    nodes.set(tokenClass, node)
    const item = toTreeItem(node, tokenClass)
    return node.children ? { ...item, children: walk(node.children) } : item
  })

  return { items: walk(items), nodes }
}

export function nodeFromEvent<T>(event: MouseEvent, nodes: Map<string, T>): T | undefined {
  const link = (event.target as HTMLElement).closest('[data-slot="link"]')
  const tokenClass = link?.className.match(/tree-node-\d+/)?.[0]
  return tokenClass ? nodes.get(tokenClass) : undefined
}

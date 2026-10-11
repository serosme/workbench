<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const props = defineProps<{
  items: TreeItem[]
  getMenu: (node?: FileTreeNode) => DropdownMenuItem[][]
}>()

const contextNode = ref<FileTreeNode>()
const tree = computed(() => buildTreeItems(props.items))
const contextItems = computed(() => props.getMenu(contextNode.value))

// UTree 只把 item.class 透传到带 data-slot="link" 的元素上（不转发任意属性），所以组树时给每个节点挂一个
// token class，并同时建 token → node 的 Map，右键时读类名反查节点
function buildTreeItems(items: TreeItem[]): { items: TreeItem[], nodes: Map<string, FileTreeNode> } {
  const nodes = new Map<string, FileTreeNode>()
  let token = 0

  const walk = (list: TreeItem[]): TreeItem[] => list.map((item) => {
    const node = item as TreeItem & { type?: FileTreeNode['type'] }
    const tokenClass = node.type ? `file-node-${token++}` : undefined
    if (tokenClass)
      nodes.set(tokenClass, node as FileTreeNode)

    return {
      ...item,
      ...(tokenClass ? { class: `${item.class ?? ''} ${tokenClass}`.trim() } : {}),
      ...(node.type === 'folder'
        ? { icon: 'i-lucide-folder' }
        : node.type === 'file'
          ? { icon: 'i-lucide-file' }
          : {}),
      ...(item.children ? { children: walk(item.children) } : {}),
    }
  })

  return { items: walk(items), nodes }
}

function openContextMenu(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest('[data-slot="link"]')
  const tokenClass = link?.className.match(/file-node-\d+/)?.[0]
  contextNode.value = tokenClass ? tree.value.nodes.get(tokenClass) : undefined
}

function getKey(item: TreeItem): string {
  return String(item.id)
}
</script>

<template>
  <UContextMenu :items="contextItems" class="block h-full">
    <div class="h-full min-h-32 w-full" @contextmenu="openContextMenu">
      <UTree
        :items="tree.items"
        :get-key="getKey"
        :ui="{ link: 'hover:text-inherit hover:before:bg-transparent before:bg-inherit text-inherit' }"
      />
    </div>
  </UContextMenu>
</template>

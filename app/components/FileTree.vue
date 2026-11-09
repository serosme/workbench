<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const props = defineProps<{
  items: FileTreeNode[]
  getMenu: (node?: FileTreeNode) => DropdownMenuItem[][]
}>()

const contextNode = ref<FileTreeNode>()
const tree = computed(() => buildTreeItems(props.items))
const contextItems = computed(() => props.getMenu(contextNode.value))

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')
const scrollMask = useScrollMask(scrollRef)

// UTree 只把 item.class 透传到带 data-slot="link" 的元素上（不转发任意属性），所以组树时给每个节点挂一个
// token class，并同时建 token → node 的 Map，右键时读类名反查节点
function buildTreeItems(items: FileTreeNode[]): { items: TreeItem[], nodes: Map<string, FileTreeNode> } {
  const nodes = new Map<string, FileTreeNode>()
  let token = 0

  const walk = (list: FileTreeNode[]): TreeItem[] => list.map((node) => {
    const tokenClass = `file-node-${token++}`
    nodes.set(tokenClass, node)

    return {
      key: node.key,
      label: node.label,
      icon: node.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file',
      class: tokenClass,
      // 带上去，模板的 #item-trailing 靠它显示大小
      size: node.size,
      ...(node.children ? { children: walk(node.children) } : {}),
    }
  })

  return { items: walk(items), nodes }
}

function openContextMenu(event: MouseEvent) {
  const link = (event.target as HTMLElement).closest('[data-slot="link"]')
  const tokenClass = link?.className.match(/file-node-\d+/)?.[0]
  contextNode.value = tokenClass ? tree.value.nodes.get(tokenClass) : undefined
}

// UTree 会拿一个空对象来探测 key（Reka 内部是 `getKey(modelValue ?? {})`），所以这里不能假设收到的都是真节点。
function getKey(item: TreeItem): string {
  return String(item.key)
}

// 模板里只出现这个包一层，避免把自动导入的 formatBytes 直接写进模板（vue-tsc 会把它当组件属性）
function sizeLabel(size?: number) {
  return size === undefined ? '' : formatBytes(size)
}
</script>

<template>
  <UContextMenu :items="contextItems" class="block min-h-0 flex-1">
    <div ref="scrollRef" class="h-full min-h-32 overflow-y-auto scrollbar-none" :style="scrollMask" @contextmenu="openContextMenu">
      <UTree :items="tree.items" :get-key="getKey" :ui="treeNavUi" size="xl">
        <template #item-trailing="{ item }">
          <span v-if="item.size" class="text-xs text-muted">{{ sizeLabel(item.size) }}</span>
        </template>
      </UTree>
    </div>
  </UContextMenu>
</template>

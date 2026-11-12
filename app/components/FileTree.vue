<script setup lang="ts">
import type { DropdownMenuItem, TreeItem } from '@nuxt/ui'

const props = defineProps<{
  items: FileTreeNode[]
  getMenu: (node?: FileTreeNode) => DropdownMenuItem[][]
}>()

const contextNode = ref<FileTreeNode>()
const tree = computed(() => withNodeTokens(props.items, (node, tokenClass) => ({
  key: node.pathname,
  label: node.label,
  icon: node.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file',
  class: tokenClass,
})))
const contextItems = computed(() => props.getMenu(contextNode.value))

const scrollRef = useTemplateRef<HTMLElement>('scrollRef')
const scrollMask = useScrollMask(scrollRef)

function openContextMenu(event: MouseEvent) {
  contextNode.value = nodeFromEvent(event, tree.value.nodes)
}

function getKey(item: TreeItem): string {
  return String(item.key)
}
</script>

<template>
  <UContextMenu :items="contextItems" class="block min-h-0 flex-1">
    <div ref="scrollRef" class="h-full min-h-32 overflow-y-auto scrollbar-none" :style="scrollMask" @contextmenu="openContextMenu">
      <UTree :items="tree.items" :get-key="getKey" :ui="treeNavUi" size="xl" />
    </div>
  </UContextMenu>
</template>

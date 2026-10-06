<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'
import type { FolderNode } from '~/utils/bookmark-tree'

const props = defineProps<{
  open: boolean
  item?: Bookmark | null
  targets: FolderNode[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'moved': []
}>()

const title = computed(() => props.item?.type === 'folder' ? 'Move Folder' : 'Move Bookmark')

// 选中的目标：null 表示根级（文件夹 id 从 1 开始，所以 null 不会和任何文件夹撞上）。
const formState = reactive<{ target: number | null }>({
  target: null,
})

const submitting = ref(false)

interface MoveTarget extends TreeItem {
  value: number | null
  children?: MoveTarget[]
}

function toItems(nodes: FolderNode[]): MoveTarget[] {
  return nodes.map(node => ({
    label: node.name,
    icon: 'i-lucide-folder',
    value: node.id,
    onSelect: () => { formState.target = node.id },
    // 默认全展开，目标一眼可见、点一下就能选（点节点本身也会切换折叠，展开着才好点）
    ...(node.children.length ? { children: toItems(node.children), defaultExpanded: true } : {}),
  }))
}

// 根级是弹窗自己补的虚拟节点，和文件夹树并列放在最前面。
const items = computed<MoveTarget[]>(() => [
  { label: 'Root', icon: 'i-lucide-folder-root', value: null, onSelect: () => { formState.target = null } },
  ...toItems(props.targets),
])

// UTree 单选时 modelValue 收的是 item 对象（内部按 getKey 比，不比较引用），传进去就有默认的选中样式。
const selected = computed(() => findItem(items.value, formState.target))

function findItem(nodes: MoveTarget[], value: number | null): MoveTarget | undefined {
  for (const node of nodes) {
    if (node.value === value)
      return node
    const found = node.children && findItem(node.children, value)
    if (found)
      return found
  }
}

function getKey(item: TreeItem) {
  return String((item as MoveTarget).value)
}

// 默认选中它当前所在的父级。
watch(() => props.open, (open) => {
  if (open)
    formState.target = props.item?.parentId ?? null
})

async function handleSubmit() {
  if (submitting.value || !props.item)
    return
  submitting.value = true
  try {
    await selfFetch('/api/bookmarks/move', {
      method: 'PUT',
      body: { id: props.item.id, parentId: formState.target },
    })

    emit('moved')
    emit('update:open', false)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="title" :description="item?.name" :ui="{ content: 'max-w-2xl' }" @update:open="emit('update:open', $event)">
    <template #body>
      <UForm :state="formState" class="space-y-4" @submit="handleSubmit">
        <UFormField label="Move to" name="target" help="Placed last in the folder">
          <div class="w-full max-h-96 overflow-y-auto rounded-md border border-default p-1">
            <UTree :items="items" :get-key="getKey" :model-value="selected" :disabled="submitting" />
          </div>
        </UFormField>
        <UButton type="submit" :loading="submitting">
          Move
        </UButton>
      </UForm>
    </template>
  </UModal>
</template>

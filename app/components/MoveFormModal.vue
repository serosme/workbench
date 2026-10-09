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
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

// 底色和书签页主树一样去掉（页面那份见 bookmarks.vue 的 treeLinkUi），但这里是选择器、必须能看出选的是哪个：
// 所以选中的那一行保留文字变色（aria-selected 由 UTree 打在节点上），悬停不上色、免得和选中混淆。
const treeLinkUi = {
  link: 'text-inherit hover:text-inherit hover:before:bg-transparent before:bg-inherit aria-selected:text-primary',
}

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

// UTree 单选时 modelValue 收的是 item 对象（内部按 getKey 比，不比较引用）。
// 底色被上面的 treeLinkUi 去掉了，这个选中态只用来给当前目标上文字色。
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
      <UForm ref="formRef" :state="formState" class="space-y-4" @submit="handleSubmit">
        <UFormField label="Move to" name="target" help="Placed last in the folder">
          <div class="w-full max-h-96 overflow-y-auto rounded-md border border-default p-1">
            <UTree :items="items" :get-key="getKey" :model-value="selected" :ui="treeLinkUi" />
          </div>
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton @click="formRef?.submit()">
          Move
        </UButton>
      </div>
    </template>
  </UModal>
</template>

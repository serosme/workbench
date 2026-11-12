<script setup lang="ts">
import type { TreeItem } from '@nuxt/ui'

const props = defineProps<{
  item?: Bookmark | null
  targets: BookmarkFolderNode[]
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { required: true })

const title = computed(() => props.item?.type === 'folder' ? 'Move Folder' : 'Move Bookmark')

const formState = reactive<{ target: number | null }>({
  target: null,
})

const submitting = ref(false)

const treeLinkUi = {
  link: 'text-inherit hover:text-inherit hover:before:bg-transparent before:bg-inherit aria-selected:text-primary',
  linkTrailingIcon: 'hidden',
}

interface MoveTarget extends TreeItem {
  value: number | null
  children?: MoveTarget[]
}

function toItems(nodes: BookmarkFolderNode[]): MoveTarget[] {
  return nodes.map(node => ({
    label: node.name,
    icon: 'i-lucide-folder',
    value: node.id,
    onSelect: () => { formState.target = node.id },
    ...(node.children.length ? { children: toItems(node.children) } : {}),
  }))
}

const items = computed<MoveTarget[]>(() => [
  { label: 'Root', icon: 'i-lucide-folder', value: null, onSelect: () => { formState.target = null } },
  ...toItems(props.targets),
])

function collectExpanded(nodes: MoveTarget[]): string[] {
  return nodes.flatMap(node => (node.children?.length ? [String(node.value), ...collectExpanded(node.children)] : []))
}
const expandedKeys = computed(() => collectExpanded(items.value))

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

watch(open, (isOpen) => {
  if (isOpen)
    formState.target = props.item?.parentId ?? null
})

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    await apiFetch('/api/bookmarks/move', {
      method: 'PUT',
      body: { id: props.item!.id, parentId: formState.target },
    })

    emit('saved')
    open.value = false
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="item?.name" :ui="{ content: 'max-w-2xl' }">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Move to" name="target" help="Placed last in the folder">
          <div class="w-full max-h-96 overflow-y-auto rounded-md border border-default p-1">
            <UTree
              :items="items"
              :get-key="getKey"
              :expanded="expandedKeys"
              :model-value="selected"
              selection-behavior="replace"
              :ui="treeLinkUi"
            />
          </div>
        </UFormField>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton @click="handleSubmit">
          Move
        </UButton>
      </div>
    </template>
  </UModal>
</template>

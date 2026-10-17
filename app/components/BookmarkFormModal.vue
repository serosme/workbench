<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  parentId?: number
  item?: Bookmark | null
}>()

const emit = defineEmits<{
  created: []
  updated: []
}>()

const open = defineModel<boolean>('open', { required: true })

// item 为空就是新增、有值就是编辑，不需要额外的 mode
const isEdit = computed(() => !!props.item)
const title = computed(() => isEdit.value ? 'Edit Bookmark' : 'New Bookmark')

const formState = reactive({
  name: '',
  url: '',
})

const formSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  url: z.string().trim().min(1, 'URL is required'),
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(open, (isOpen) => {
  if (isOpen) {
    formState.name = props.item?.name ?? ''
    formState.url = props.item?.url ?? ''
  }
})

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    if (isEdit.value) {
      const body: UpdateBookmarkInput = { name: formState.name, url: formState.url }
      // 编辑只提交可改字段：type / parentId / position 由服务端保持不变
      await selfFetch(`/api/bookmarks/${props.item!.id}`, { method: 'PUT', body })
      emit('updated')
    }
    else {
      const body: CreateBookmarkInput = {
        type: 'bookmark',
        name: formState.name,
        url: formState.url,
        parentId: props.parentId,
      }
      await selfFetch('/api/bookmarks', { method: 'POST', body })
      emit('created')
    }
    open.value = false
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <UForm ref="formRef" :state="formState" :schema="formSchema" class="space-y-4" @submit="handleSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="formState.name" class="w-full" />
        </UFormField>
        <UFormField label="URL" name="url" required>
          <UInput v-model="formState.url" class="w-full" />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton @click="formRef?.submit()">
          {{ isEdit ? 'Save' : 'Create' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

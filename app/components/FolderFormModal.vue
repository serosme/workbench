<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

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
const title = computed(() => isEdit.value ? 'Edit Folder' : 'New Folder')

const formState = reactive({
  name: '',
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(open, (isOpen) => {
  if (isOpen)
    formState.name = props.item?.name ?? ''
})

function validate(state: typeof formState): FormError<string>[] {
  const errors: FormError<string>[] = []
  if (!state.name.trim())
    errors.push({ name: 'name', message: 'Name is required' })
  return errors
}

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    if (isEdit.value) {
      await selfFetch(`/api/bookmarks/${props.item!.id}`, {
        method: 'PUT',
        // 编辑只提交可改字段：type / parentId / position 由服务端保持不变
        body: { name: formState.name },
      })
      emit('updated')
    }
    else {
      const body: Pick<InsertBookmark, 'type' | 'name' | 'parentId'> = {
        type: 'folder',
        name: formState.name,
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
      <UForm ref="formRef" :state="formState" class="space-y-4" :validate="validate" @submit="handleSubmit">
        <UFormField label="Name" name="name" required>
          <UInput v-model="formState.name" class="w-full" />
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

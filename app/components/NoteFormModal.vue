<script setup lang="ts">
const props = defineProps<{
  open: boolean
  item?: Note | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

// item 为空就是新增、有值就是编辑，不需要额外的 mode
const isEdit = computed(() => !!props.item)
const title = computed(() => isEdit.value ? 'Edit Note' : 'New Note')

const formState = reactive({
  content: '',
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(() => props.open, (open) => {
  if (open)
    formState.content = props.item?.content ?? ''
})

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    const body = { content: formState.content.trim() }
    if (isEdit.value) {
      await selfFetch(`/api/notes/${props.item!.id}`, { method: 'PUT', body })
    }
    else {
      await selfFetch('/api/notes', { method: 'POST', body })
    }
    emit('saved')
    emit('update:open', false)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :ui="{ content: 'max-w-4xl' }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <UForm ref="formRef" :state="formState" class="space-y-4" @submit="handleSubmit">
        <UTextarea
          v-model="formState.content"
          class="w-full"
          :rows="20"
          :ui="{ base: 'resize-none' }"
          autofocus
          placeholder="Write something…"
        />
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton :disabled="!formState.content.trim()" @click="formRef?.submit()">
          Save
        </UButton>
      </div>
    </template>
  </UModal>
</template>

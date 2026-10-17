<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  item?: Note | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { required: true })

// item 为空就是新增、有值就是编辑，不需要额外的 mode
const isEdit = computed(() => !!props.item)
const modalTitle = computed(() => isEdit.value ? 'Edit Note' : 'New Note')

const formState = reactive({
  title: '',
  content: '',
  // 书写日期在表单里存 "YYYY-MM-DD" 字符串
  writtenAt: '',
})

const formSchema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  content: z.string().trim().min(1, 'Content is required'),
  writtenAt: z.string().min(1, 'Date is required'),
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(open, (isOpen) => {
  if (isOpen) {
    formState.title = props.item?.title ?? ''
    formState.content = props.item?.content ?? ''
    // 新增默认今天；编辑回显该笔记的书写日期
    formState.writtenAt = toDateKey(props.item?.writtenAt ?? Date.now())
  }
})

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    const body: SaveNoteInput = {
      title: formState.title.trim(),
      content: formState.content.trim(),
      writtenAt: dateKeyToMs(formState.writtenAt),
    }
    if (isEdit.value) {
      await selfFetch(`/api/notes/${props.item!.id}`, { method: 'PUT', body })
    }
    else {
      await selfFetch('/api/notes', { method: 'POST', body })
    }
    emit('saved')
    open.value = false
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :ui="{ content: 'max-w-4xl' }"
  >
    <template #body>
      <UForm ref="formRef" :state="formState" :schema="formSchema" class="space-y-4" @submit="handleSubmit">
        <UFormField label="Title" name="title" required>
          <UInput v-model="formState.title" class="w-full" autofocus placeholder="Title" />
        </UFormField>
        <UFormField label="Date" name="writtenAt" required>
          <DatePicker v-model="formState.writtenAt" />
        </UFormField>
        <UFormField label="Content" name="content" required>
          <UTextarea
            v-model="formState.content"
            class="w-full"
            :rows="20"
            :ui="{ base: 'resize-none' }"
            placeholder="Write something…"
          />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton :disabled="!formState.title.trim() || !formState.content.trim()" @click="formRef?.submit()">
          Save
        </UButton>
      </div>
    </template>
  </UModal>
</template>

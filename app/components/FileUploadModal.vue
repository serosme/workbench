<script setup lang="ts">
const props = defineProps<{
  defaultPathname: string
  upload: (pathname: string, file: File) => Promise<void>
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { required: true })

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const file = ref<File>()
const pathname = ref('')
const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(open, (isOpen) => {
  if (isOpen) {
    pathname.value = props.defaultPathname
    file.value = undefined
  }
})

const prefix = computed(() => pathname.value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))

const target = computed(() => `${prefix.value ? `${prefix.value}/` : ''}${file.value?.name ?? ''}`)

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  file.value = input.files?.[0]
  input.value = ''
}

async function handleSubmit() {
  if (!file.value || submitting.value)
    return
  submitting.value = true
  try {
    await props.upload(target.value, file.value)
    emit('saved')
    open.value = false
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal v-model:open="open" title="Upload File">
    <template #body>
      <UForm ref="formRef" :state="{ target }" class="space-y-4" @submit="handleSubmit">
        <UFormField label="File" required>
          <div class="flex items-center gap-2">
            <UButton
              icon="i-lucide-file-plus"
              color="neutral"
              variant="outline"
              label="Choose File"
              class="cursor-pointer"
              :disabled="submitting"
              @click="fileInput?.click()"
            />
            <span class="truncate text-sm text-muted">
              {{ file?.name || 'No file chosen' }}
            </span>
          </div>
          <input ref="fileInput" type="file" class="hidden" :disabled="submitting" @change="pickFile">
        </UFormField>
        <UFormField label="Path">
          <UInput v-model="pathname" class="w-full" placeholder="Leave empty for root" :disabled="submitting" />
        </UFormField>
        <UFormField label="Full Path">
          <UInput :model-value="target" class="w-full" readonly />
        </UFormField>
      </UForm>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <UButton :disabled="!file" @click="formRef?.submit()">
          Upload
        </UButton>
      </div>
    </template>
  </UModal>
</template>

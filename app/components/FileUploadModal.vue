<script setup lang="ts">
const props = defineProps<{
  open: boolean
  defaultPath: string
  upload: (key: string, file: File, onProgress?: (percent: number) => void) => Promise<void>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const file = ref<File>()
const path = ref('')
const progress = ref(0)
const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(() => props.open, (open) => {
  if (open) {
    path.value = props.defaultPath
    file.value = undefined
    progress.value = 0
  }
})

// 目录就是 key 的前缀：拼在文件名前面的这一段既可以是已存在的文件夹，也可以是新路径
const prefix = computed(() => path.value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))

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
  progress.value = 0
  try {
    await props.upload(target.value, file.value, (percent) => {
      progress.value = Math.round(percent)
    })
    emit('saved')
    emit('update:open', false)
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" title="Upload File" @update:open="emit('update:open', $event)">
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
              @click="fileInput?.click()"
            />
            <span class="truncate text-sm text-muted">
              {{ file?.name || 'No file chosen' }}
            </span>
          </div>
          <input ref="fileInput" type="file" class="hidden" @change="pickFile">
        </UFormField>
        <UFormField label="Path">
          <UInput v-model="path" class="w-full" placeholder="Leave empty for root" />
        </UFormField>
        <UFormField label="Full Path">
          <UInput :model-value="target" class="w-full" readonly />
        </UFormField>
        <div v-if="submitting" class="space-y-1">
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div class="h-full rounded-full bg-primary transition-all" :style="{ width: `${progress}%` }" />
          </div>
          <p class="text-xs text-muted">
            {{ progress }}%
          </p>
        </div>
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

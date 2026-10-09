<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

const props = defineProps<{
  open: boolean
  mode: 'create' | 'edit'
  nextPosition?: number
  parentId?: number
  item?: Bookmark | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
  'updated': []
}>()

const title = computed(() => props.mode === 'create' ? 'New Folder' : 'Edit Folder')

const formState = reactive({
  name: '',
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(() => props.open, (open) => {
  if (open) {
    if (props.mode === 'edit' && props.item)
      formState.name = props.item.name
    else
      formState.name = ''
  }
})

function validate(state: typeof formState): FormError<string>[] {
  const errors: FormError<string>[] = []
  if (!state.name)
    errors.push({ name: 'name', message: 'Name is required' })
  return errors
}

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    if (props.mode === 'create') {
      const body: InsertBookmark = {
        type: 'folder',
        name: formState.name,
        position: props.nextPosition ?? 1,
        parentId: props.parentId,
      }

      await selfFetch('/api/bookmarks', {
        method: 'POST',
        body,
      })

      emit('created')
      emit('update:open', false)
    }
    else {
      const body: InsertBookmark = {
        type: 'folder',
        name: formState.name,
        position: props.item?.position ?? props.nextPosition ?? 1,
        parentId: props.item?.parentId ?? null,
      }

      await selfFetch(`/api/bookmarks/${props.item!.id}`, {
        method: 'PUT',
        body,
      })

      emit('updated')
      emit('update:open', false)
    }
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal :open="open" :title="title" @update:open="emit('update:open', $event)">
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
          {{ mode === 'create' ? 'Create' : 'Save' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { z } from 'zod'

const props = defineProps<{
  item?: Expense | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const open = defineModel<boolean>('open', { required: true })

// item 为空就是新增、有值就是编辑，不需要额外的 mode
const isEdit = computed(() => !!props.item)
const modalTitle = computed(() => isEdit.value ? 'Edit Expense' : 'New Expense')

const formState = reactive({
  item: '',
  amount: '',
  // 日期在表单里存 "YYYY-MM-DD" 字符串
  spentAt: '',
})

const formSchema = z.object({
  item: z.string().trim().min(1, 'Item is required'),
  amount: z.string().refine((value) => {
    const amount = parseAmount(value)
    return Number.isFinite(amount) && amount > 0
  }, 'Amount must be greater than 0'),
  spentAt: z.string().min(1, 'Date is required'),
})

const submitting = ref(false)
const formRef = useTemplateRef<{ submit: () => Promise<void> }>('formRef')

watch(open, (isOpen) => {
  if (isOpen) {
    formState.item = props.item?.item ?? ''
    formState.amount = props.item ? formatAmount(props.item.amount) : ''
    formState.spentAt = toDateKey(props.item?.spentAt ?? Date.now())
  }
})

async function handleSubmit() {
  if (submitting.value)
    return
  submitting.value = true
  try {
    const body: SaveExpenseInput = {
      item: formState.item.trim(),
      amount: parseAmount(formState.amount),
      spentAt: dateKeyToMs(formState.spentAt),
    }
    if (isEdit.value) {
      await selfFetch(`/api/expenses/${props.item!.id}`, { method: 'PUT', body })
    }
    else {
      await selfFetch('/api/expenses', { method: 'POST', body })
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
  >
    <template #body>
      <UForm ref="formRef" :state="formState" :schema="formSchema" class="space-y-4" @submit="handleSubmit">
        <UFormField label="Item" name="item" required>
          <UInput v-model="formState.item" class="w-full" autofocus placeholder="What did you buy?" />
        </UFormField>
        <UFormField label="Amount" name="amount" required>
          <UInput v-model="formState.amount" class="w-full" type="number" step="0.01" min="0" placeholder="0.00" />
        </UFormField>
        <UFormField label="Date" name="spentAt" required>
          <DatePicker v-model="formState.spentAt" />
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

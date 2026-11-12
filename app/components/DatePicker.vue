<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { parseDate } from '@internationalized/date'

const model = defineModel<string>({ required: true })

const value = computed(() => (model.value
  ? parseDate(model.value)
  : undefined))

const input = computed<DateValue | null>({
  get: () => value.value ?? null,
  set: (v) => {
    model.value = v
      ? v.toString()
      : ''
  },
})
const calendar = computed<DateValue | undefined>({
  get: () => value.value,
  set: (v) => {
    model.value = v
      ? v.toString()
      : ''
  },
})

const dateField = useTemplateRef<HTMLElement>('dateField')
</script>

<template>
  <div ref="dateField" class="inline-block">
    <UInputDate v-model="input">
      <template #trailing>
        <UPopover
          :reference="dateField ?? undefined"
          :content="{ side: 'right', align: 'start', sideOffset: 8 }"
        >
          <UButton
            color="neutral"
            variant="link"
            size="sm"
            icon="i-lucide-calendar"
            aria-label="Select a date"
            class="px-0"
          />
          <template #content="{ close }">
            <UCalendar v-model="calendar" class="p-2" @update:model-value="close?.()" />
          </template>
        </UPopover>
      </template>
    </UInputDate>
  </div>
</template>

<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import { parseDate } from '@internationalized/date'

// 对外只有一个 "YYYY-MM-DD" 字符串，调用方不关心 UInputDate/UCalendar 的空值差异
const model = defineModel<string>({ required: true })

const value = computed(() => (model.value ? parseDate(model.value) : undefined))

// UInputDate 空值用 null、UCalendar 用 undefined，各配一个 computed，共用同一份字符串
const input = computed<DateValue | null>({
  get: () => value.value ?? null,
  set: (v) => { model.value = v ? v.toString() : '' },
})
const calendar = computed<DateValue | undefined>({
  get: () => value.value,
  set: (v) => { model.value = v ? v.toString() : '' },
})

// 用包住输入框的 div 作为 UPopover 的定位参照，让日历弹在整个输入框右侧而不是压在框上
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

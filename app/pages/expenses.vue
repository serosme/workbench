<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const expenseForm = useExpenseForm()
const { expenses, refresh } = useExpenses()
const { remove } = useDeleteExpense(refresh)
const { getMenu } = useExpenseMenu(expenseForm, remove)

const contextExpense = ref<Expense>()
const contextMenuItems = computed<DropdownMenuItem[][]>(() => getMenu(contextExpense.value))

const groups = computed(() => {
  const map = new Map<string, { date: string, total: number, items: Expense[] }>()
  for (const expense of expenses.value) {
    const date = toDateKey(expense.spentAt)
    let group = map.get(date)
    if (!group) {
      group = { date, total: 0, items: [] }
      map.set(date, group)
    }
    group.items.push(expense)
    group.total += expense.amount
  }
  return [...map.values()]
})

// 把按天的分组再按「月」聚合，用于每月分段标题
const months = computed(() => {
  const map = new Map<string, { month: string, total: number, groups: typeof groups.value }>()
  for (const group of groups.value) {
    const month = group.date.slice(0, 7)
    let entry = map.get(month)
    if (!entry) {
      entry = { month, total: 0, groups: [] }
      map.set(month, entry)
    }
    entry.total += group.total
    entry.groups.push(group)
  }
  return [...map.values()]
})

function openContextMenu(event: MouseEvent) {
  const row = (event.target as HTMLElement).closest<HTMLElement>('[data-expense-id]')
  contextExpense.value = expenses.value.find(e => e.id === Number(row?.dataset.expenseId))
}
</script>

<template>
  <div class="h-full">
    <UContextMenu :items="contextMenuItems" class="block h-full">
      <div class="h-full overflow-y-auto scrollbar-none" @contextmenu="openContextMenu">
        <div class="space-y-6">
          <section v-for="entry in months" :key="entry.month" class="space-y-6">
            <!-- 月份卡片：显示该月合计 -->
            <UCard :ui="{ root: 'ring-inset' }">
              <div class="flex items-end justify-between">
                <span class="text-sm font-medium text-muted">{{ formatMonthKey(entry.month) }}</span>
                <span class="text-lg font-semibold tabular-nums text-highlighted">¥{{ formatAmount(entry.total) }}</span>
              </div>
            </UCard>
            <div class="space-y-6">
              <UCard
                v-for="group in entry.groups"
                :key="group.date"
                :ui="{ root: 'ring-inset', header: 'p-6', body: 'px-6 pt-1.5 pb-1.5 divide-y divide-default sm:pt-1.5 sm:pb-1.5' }"
              >
                <template #header>
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-muted">{{ formatDateKey(group.date) }}</span>
                    <span class="tabular-nums text-muted">¥{{ formatAmount(group.total) }}</span>
                  </div>
                </template>
                <div
                  v-for="expense in group.items"
                  :key="expense.id"
                  :data-expense-id="expense.id"
                  class="flex cursor-pointer items-center justify-between gap-4 py-4.5"
                  @click="expenseForm.openEdit(expense)"
                >
                  <p class="min-w-0 truncate text-highlighted">
                    {{ expense.item }}
                  </p>
                  <span class="tabular-nums">¥{{ formatAmount(expense.amount) }}</span>
                </div>
              </UCard>
            </div>
          </section>
        </div>
      </div>
    </UContextMenu>

    <ExpenseFormModal
      v-model:open="expenseForm.modal.open"
      :item="expenseForm.modal.item"
      @saved="refresh"
    />
  </div>
</template>

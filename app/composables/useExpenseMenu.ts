import type { DropdownMenuItem } from '@nuxt/ui'

export function useExpenseMenu(
  expenseForm: ReturnType<typeof useExpenseForm>,
  remove: (id: number) => Promise<void>,
) {
  function getMenu(expense?: Expense): DropdownMenuItem[][] {
    if (!expense) {
      return [[
        {
          label: 'New Expense',
          icon: 'i-lucide-plus',
          onSelect() { expenseForm.openCreate() },
        },
      ]]
    }

    return [
      [
        {
          label: 'Edit',
          icon: 'i-lucide-pencil',
          onSelect() { expenseForm.openEdit(expense) },
        },
      ],
      [
        {
          label: 'Delete',
          icon: 'i-lucide-trash-2',
          color: 'error',
          onSelect() { remove(expense.id) },
        },
      ],
    ]
  }

  return { getMenu }
}

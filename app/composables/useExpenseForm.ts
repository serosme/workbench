export function useExpenseForm() {
  const modal = reactive<{
    open: boolean
    item: Expense | null
  }>({
    open: false,
    item: null,
  })

  function openCreate() {
    modal.open = true
    modal.item = null
  }

  function openEdit(item: Expense) {
    modal.open = true
    modal.item = item
  }

  return { modal, openCreate, openEdit }
}

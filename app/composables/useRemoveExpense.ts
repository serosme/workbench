export function useRemoveExpense(refresh: () => Promise<unknown>) {
  const toast = useToast()

  async function remove(id: number) {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Expense deleted', color: 'success' })
  }

  return { remove }
}

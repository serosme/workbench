export function useDeleteExpense(refresh: () => void) {
  const toast = useToast()

  async function remove(id: number) {
    await selfFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Expense deleted', color: 'success' })
  }

  return { remove }
}

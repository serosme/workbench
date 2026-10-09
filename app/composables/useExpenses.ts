export function useExpenses() {
  const { data, refresh } = useSelfFetch<Expense[]>('/api/expenses', {
    default: () => [],
  })

  return {
    expenses: data,
    refresh,
  }
}

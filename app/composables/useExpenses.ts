export function useExpenses() {
  const { data, refresh } = useApiFetch('/api/expenses', {
    default: () => [],
  })

  return {
    expenses: data,
    refresh,
  }
}

export function useExpenses() {
  const { data, refresh } = useSelfFetch('/api/expenses', {
    default: () => [],
  })

  return {
    expenses: data,
    refresh,
  }
}

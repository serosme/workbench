export function useNotes() {
  const { data, refresh } = useApiFetch('/api/notes', {
    default: () => [],
  })

  return {
    notes: data,
    refresh,
  }
}

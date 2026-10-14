export function useNotes() {
  const { data, refresh } = useSelfFetch('/api/notes', {
    default: () => [],
  })

  return {
    notes: data,
    refresh,
  }
}

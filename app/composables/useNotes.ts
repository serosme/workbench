export function useNotes() {
  const { data, refresh } = useSelfFetch<Note[]>('/api/notes', {
    default: () => [],
  })

  return {
    notes: data,
    refresh,
  }
}

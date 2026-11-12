export function useRemoveNote(refresh: () => Promise<unknown>) {
  const toast = useToast()

  async function remove(id: number) {
    await apiFetch(`/api/notes/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Note deleted', color: 'success' })
  }

  return { remove }
}

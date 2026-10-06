export function useDeleteNote(refresh: () => void) {
  const toast = useToast()

  async function remove(id: number) {
    await selfFetch(`/api/notes/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Note deleted', color: 'success' })
  }

  return { remove }
}

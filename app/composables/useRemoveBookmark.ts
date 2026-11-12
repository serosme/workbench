export function useRemoveBookmark(refresh: () => Promise<unknown>) {
  const toast = useToast()

  async function remove(id: number) {
    await apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Bookmark deleted', color: 'success' })
  }

  return { remove }
}

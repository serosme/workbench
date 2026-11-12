export function useRemoveBookmarkFolder(refresh: () => Promise<unknown>) {
  const toast = useToast()

  async function remove(id: number) {
    await apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    refresh()
    toast.add({ title: 'Folder deleted', color: 'success' })
  }

  return { remove }
}

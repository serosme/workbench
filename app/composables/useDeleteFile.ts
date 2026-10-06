export function useDeleteFile(refresh: () => void) {
  const toast = useToast()

  async function remove(path: string) {
    await selfFetch('/api/files/delete', { method: 'DELETE', query: { path } })
    refresh()
    toast.add({ title: 'File deleted', color: 'success' })
  }

  return { remove }
}

export function useDeleteFile(refresh: () => void) {
  const toast = useToast()

  async function remove(path: string, type: FileTreeNode['type']) {
    await selfFetch('/api/files', { method: 'DELETE', query: { path } })
    refresh()
    toast.add({ title: type === 'folder' ? 'Folder deleted' : 'File deleted', color: 'success' })
  }

  return { remove }
}

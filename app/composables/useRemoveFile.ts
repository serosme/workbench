export function useRemoveFile(refresh: () => Promise<unknown>) {
  const toast = useToast()

  async function remove(pathname: string, type: FileTreeNode['type']) {
    await apiFetch('/api/files', { method: 'DELETE', query: { pathname } })
    refresh()
    toast.add({ title: type === 'folder' ? 'Folder deleted' : 'File deleted', color: 'success' })
  }

  return { remove }
}

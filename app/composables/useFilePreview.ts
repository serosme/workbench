export function useFilePreview() {
  const modal = reactive({
    open: false,
    pathname: '',
    content: '',
  })

  async function open(node: FileTreeNode) {
    const { content } = await apiFetch('/api/files/preview', { query: { pathname: node.pathname } })
    modal.pathname = node.pathname
    modal.content = content
    modal.open = true
  }

  return { modal, open }
}

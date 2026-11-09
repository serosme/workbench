export function useFilePreview() {
  const modal = reactive({
    open: false,
    path: '',
    content: '',
  })

  // 先拿到内容再开弹窗：失败时 selfFetch 已经弹过 toast，弹窗不打开就是最终状态，省掉 loading 态
  async function open(node: FileTreeNode) {
    const { content } = await selfFetch('/api/files/preview', { query: { path: node.key } })
    modal.path = node.key
    modal.content = content
    modal.open = true
  }

  return { modal, open }
}

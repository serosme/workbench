// 书签树节点的弹窗状态：书签和文件夹的弹窗形状一样（parentId + item），页面按用途各实例化一份。
export function useBookmarkForm() {
  const modal = reactive<{
    open: boolean
    parentId?: number
    item: Bookmark | null
  }>({
    open: false,
    parentId: undefined,
    item: null,
  })

  function openCreate(parentId?: number) {
    modal.open = true
    modal.parentId = parentId
    modal.item = null
  }

  function openEdit(item: Bookmark) {
    modal.open = true
    modal.parentId = undefined
    modal.item = item
  }

  return { modal, openCreate, openEdit }
}

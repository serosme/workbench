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

export function useMoveForm() {
  const modal = reactive<{
    open: boolean
    item: Bookmark | null
  }>({
    open: false,
    item: null,
  })

  function openMove(item: Bookmark) {
    modal.open = true
    modal.item = item
  }

  return { modal, openMove }
}

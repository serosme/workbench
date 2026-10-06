export function useNoteForm() {
  const modal = reactive<{
    open: boolean
    item: Note | null
  }>({
    open: false,
    item: null,
  })

  function openCreate() {
    modal.open = true
    modal.item = null
  }

  function openEdit(item: Note) {
    modal.open = true
    modal.item = item
  }

  return { modal, openCreate, openEdit }
}

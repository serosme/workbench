export function useFileUploadForm() {
  const modal = reactive({
    open: false,
    defaultPath: '',
  })

  function open(defaultPath = '') {
    modal.defaultPath = defaultPath
    modal.open = true
  }

  return { modal, open }
}

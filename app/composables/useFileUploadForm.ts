export function useFileUploadForm() {
  const modal = reactive({
    open: false,
    defaultPathname: '',
  })

  function open(pathname = '') {
    modal.defaultPathname = pathname
    modal.open = true
  }

  return { modal, open }
}

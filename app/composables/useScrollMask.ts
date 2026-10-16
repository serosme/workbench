export function useScrollMask(element: Ref<HTMLElement | null>) {
  const { style } = useScrollShadow(element)

  function measure() {
    element.value?.dispatchEvent(new Event('scroll'))
  }

  watch(element, (node) => {
    if (!node)
      return
    const mutations = new MutationObserver(measure)
    const resizes = new ResizeObserver(measure)
    mutations.observe(node, { childList: true, subtree: true })
    resizes.observe(node)
    onScopeDispose(() => {
      mutations.disconnect()
      resizes.disconnect()
    })
  }, { immediate: true })

  return style
}

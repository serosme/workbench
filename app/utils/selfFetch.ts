export const selfFetch = $fetch.create({
  onResponseError({ response }) {
    if (response.status === 401 && !response.url.includes('/api/auth/')) {
      navigateTo(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
    }
    else {
      useToast().add({
        color: 'error',
        title: response.statusText,
        description: response._data?.message ?? response.statusText,
      })
    }
  },
  onRequestError({ error }) {
    if (error.name === 'AbortError') {
      return
    }
    useToast().add({
      color: 'error',
      title: error.name,
      description: error.message,
    })
  },
})

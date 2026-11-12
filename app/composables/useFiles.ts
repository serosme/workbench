const PART_SIZE = 10 * 1024 * 1024

export function useFiles() {
  const toast = useToast()
  const { data, error, refresh } = useApiFetch('/api/files')

  const ready = computed(() => data.value !== undefined || error.value !== undefined)
  const tree = computed(() => buildFileTree(data.value ?? []))

  const upload = async (pathname: string, file: File) => {
    const prefix = pathname.split('/').slice(0, -1).join('/')

    const multipart = useMultipartUpload('/api/files/multipart', {
      partSize: PART_SIZE,
      concurrent: 1,
      prefix,
    })

    const { completed } = multipart(file)

    try {
      if (!await completed)
        throw new Error('Upload failed')
    }
    catch (error) {
      toast.add({ color: 'error', title: 'Upload failed' })
      throw error
    }
  }

  return {
    tree,
    ready,
    upload,
    refresh,
  }
}

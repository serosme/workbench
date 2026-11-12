import type { BlobObject } from '@nuxthub/core/blob'

export async function listBlobs(prefix: string): Promise<BlobObject[]> {
  const objects: BlobObject[] = []
  let cursor: string | undefined

  do {
    const page = await blob.list(cursor ? { cursor } : undefined)
    objects.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  const base = prefix.replace(/\/+$/, '')
  if (!base)
    return objects

  return objects.filter(item => item.pathname.startsWith(`${base}/`))
}

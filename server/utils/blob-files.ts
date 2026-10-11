import type { BlobObject } from '@nuxthub/core/blob'

// @nuxthub/blob 的 fs driver 把 list 的 prefix 当目录名处理（join(dir, prefix)）：
// 传文件 key 会以「读目录」失败返回空列表，所以统一拉全量再在内存里按前缀过滤。
// 前缀尾部斜杠要剥掉再比较，否则会把 docs 也当成 docs-other.txt 的前缀。
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

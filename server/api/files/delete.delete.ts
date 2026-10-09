import { blob } from '@nuxthub/blob'
import { listBlobs } from '../../utils/blob-files'

// 文件夹的 key 以 / 结尾：前缀匹配带出整棵子树后一次性删除（driver 的 delete 会忽略不存在的 key）
export default defineEventHandler(async (event) => {
  const path = String(getQuery(event).path ?? '')
  if (!path)
    throw createError({ status: 400, message: 'File path is required' })

  await blob.del(path.endsWith('/') ? (await listBlobs(path)).map(item => item.pathname) : path)
})

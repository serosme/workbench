import { db, schema } from '@nuxthub/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<Pick<InsertNote, 'title' | 'content' | 'writtenAt'>>(event)
  await db.insert(schema.notes).values({
    title: body.title,
    content: body.content,
    // writtenAt 就是笔记的书写日期（表单默认今天），由客户端提交
    writtenAt: body.writtenAt,
  }).run()
})

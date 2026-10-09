import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const bookmarks = sqliteTable('bookmarks', {
  id: integer().primaryKey({ autoIncrement: true }),
  parentId: integer(),
  type: text().$type<'folder' | 'bookmark'>().notNull(),
  name: text().notNull(),
  url: text(),
  position: integer().notNull(),
})

export const notes = sqliteTable('notes', {
  id: integer().primaryKey({ autoIncrement: true }),
  content: text().notNull(),
  createdAt: integer().notNull(),
})

export const expenses = sqliteTable('expenses', {
  id: integer().primaryKey({ autoIncrement: true }),
  item: text().notNull(),
  // 金额存「分」：SQLite 的 real 是 IEEE754，直接用元累加会出现浮点误差
  amount: integer().notNull(),
  spentAt: integer().notNull(),
})

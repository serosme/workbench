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
  title: text().notNull(),
  content: text().notNull(),
  writtenAt: integer().notNull(),
})

export const expenses = sqliteTable('expenses', {
  id: integer().primaryKey({ autoIncrement: true }),
  item: text().notNull(),
  amount: integer().notNull(),
  spentAt: integer().notNull(),
})

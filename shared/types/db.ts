import type { schema } from '@nuxthub/db'

export type Bookmark = typeof schema.bookmarks.$inferSelect
export type InsertBookmark = typeof schema.bookmarks.$inferInsert

export type Note = typeof schema.notes.$inferSelect
export type InsertNote = typeof schema.notes.$inferInsert

export type Expense = typeof schema.expenses.$inferSelect
export type InsertExpense = typeof schema.expenses.$inferInsert

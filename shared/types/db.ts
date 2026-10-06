import type { schema } from '@nuxthub/db'

// Select types (for reading data)
export type Bookmark = typeof schema.bookmarks.$inferSelect

// Insert types (for creating data)
export type InsertBookmark = typeof schema.bookmarks.$inferInsert

// Select types (for reading data)
export type Note = typeof schema.notes.$inferSelect

// Insert types (for creating data)
export type InsertNote = typeof schema.notes.$inferInsert

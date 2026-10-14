import type { schema } from '@nuxthub/db'

// Select types (for reading data)
export type Bookmark = typeof schema.bookmarks.$inferSelect

// Insert types (for creating data)
export type InsertBookmark = typeof schema.bookmarks.$inferInsert

// Select types (for reading data)
export type Note = typeof schema.notes.$inferSelect

// Insert types (for creating data)
export type InsertNote = typeof schema.notes.$inferInsert

// Select types (for reading data)
export type Expense = typeof schema.expenses.$inferSelect

// Insert types (for creating data)
export type InsertExpense = typeof schema.expenses.$inferInsert

// 写入契约：请求体的字段清单只写这一份，服务端 handler 与前端表单都引用它。
// 为什么必须手写：`readBody<T>` 的类型不会反向推断到调用方，前端 `selfFetch` 的 body 在
// 路由类型里只有声明过形状的 handler 才能收窄（见 nuxt.config.ts 的 routeTypedFetch）。
export type CreateBookmarkInput = Pick<InsertBookmark, 'type' | 'name' | 'url' | 'parentId'>

export type UpdateBookmarkInput = Pick<InsertBookmark, 'name' | 'url'>

export interface MoveBookmarkInput {
  id: number
  parentId: number | null
}

export interface ReorderBookmarksInput {
  parentId: number | null
  type: Bookmark['type']
  ids: number[]
}

export type SaveNoteInput = Pick<InsertNote, 'title' | 'content' | 'writtenAt'>

export type SaveExpenseInput = Pick<InsertExpense, 'item' | 'amount' | 'spentAt'>

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

import type { H3Event } from 'h3'
import { createError } from 'nuxt/server'
import { z } from 'zod'

export function getNumericId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0)
    throw createError({ statusCode: 400, message: 'Invalid id' })
  return id
}

export const createBookmarkSchema = z.object({
  type: z.enum(['folder', 'bookmark']),
  name: z.string().trim().min(1),
  url: z.string().trim().min(1).nullish(),
  parentId: z.number().int().positive().nullish(),
})

export const updateBookmarkSchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().min(1).nullish(),
})

export const moveBookmarkSchema = z.object({
  id: z.number().int().positive(),
  parentId: z.number().int().positive().nullable(),
})

export const reorderBookmarksSchema = z.object({
  parentId: z.number().int().positive().nullable(),
  type: z.enum(['folder', 'bookmark']),
  ids: z.array(z.number().int().positive()).min(1),
})

export const saveNoteSchema = z.object({
  title: z.string().trim().min(1),
  content: z.string().trim().min(1),
  writtenAt: z.number().int().nonnegative(),
})

export const saveExpenseSchema = z.object({
  item: z.string().trim().min(1),
  amount: z.number().int().positive(),
  spentAt: z.number().int().nonnegative(),
})

import { tool } from 'ai'
import { z } from 'zod'

const dateKeySchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => toDateKey(dateKeyToMs(value)) === value)

export const addNote = tool({
  description: `Add a note to the user's notes. Use it when the user asks you to write something down.

Always ask for confirmation first: tell the user exactly what you are about to save, and call this tool only after they agree.

Parameters:
- title: the note title.
- content: the note body (plain text).
- writtenDate: the date the note belongs to, as YYYY-MM-DD in Asia/Shanghai; omit it to use today. It is the group the note shows up under in the app, not the storage time.

This tool only adds: it cannot edit or delete an existing note, so tell the user to do that in the app.`,
  inputSchema: z.object({
    title: z.string().trim().min(1).describe('Note title.'),
    content: z.string().trim().min(1).describe('Note body text.'),
    writtenDate: dateKeySchema.optional().describe('Written date as YYYY-MM-DD; defaults to today.'),
  }),
  execute: async ({ title, content, writtenDate }) => {
    return {
      created: await createNote({
        title,
        content,
        writtenAt: dateKeyToMs(writtenDate ?? toDateKey(Date.now())),
      }),
    }
  },
})

import { tool } from 'ai'
import { z } from 'zod'

export const insertNote = tool({
  description: `Insert a new note into the user's notes. Use this when the user asks you to write down or save a note.
The date is a "YYYY-MM-DD" string in Asia/Shanghai; omit it to use today. This tool only inserts — it cannot edit or delete an existing note, so tell the user to do that in the app.`,
  inputSchema: z.object({
    title: z.string().describe('Note title.'),
    content: z.string().describe('Note body text.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Written date as YYYY-MM-DD; defaults to today.'),
  }),
  execute: async ({ title, content, date }) => {
    return await createNote({
      title,
      content,
      writtenAt: dateKeyToMs(date ?? toDateKey(Date.now())),
    })
  },
})

import { tool } from 'ai'
import { z } from 'zod'

export const insertBookmark = tool({
  description: `Insert a new bookmark (a URL) into the user's bookmark tree. Use this when the user asks you to save or add a link.
The bookmark is appended to the end of its folder. To file it into a folder, first find the folder's id with queryDatabase (rows where type = 'folder'), then pass it as parentId; omit parentId to add it at the root level.
This tool only inserts. It cannot create folders, nor edit, move or delete existing bookmarks — tell the user to do those in the app.`,
  inputSchema: z.object({
    name: z.string().describe('Display name / title of the bookmark.'),
    url: z.string().describe('The bookmark URL.'),
    parentId: z.number().int().nullable().optional().describe('An existing folder id to insert into; omit or null for the root level.'),
  }),
  execute: async ({ name, url, parentId }) => {
    return await createBookmark({ type: 'bookmark', name, url, parentId: parentId ?? null })
  },
})

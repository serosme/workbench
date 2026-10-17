import { tool } from 'ai'
import { z } from 'zod'

export const addBookmark = tool({
  description: `Add a bookmark (a URL) to the user's bookmark tree. Use it when the user asks you to save or add a link.

Always ask for confirmation first: tell the user exactly what you are about to save, and call this tool only after they agree.

Parameters:
- name: the display name / title of the bookmark.
- url: the URL to save.

The bookmark is appended to the end of the tree, at the root level. This tool only adds: it cannot file the bookmark into a folder, nor edit, move or delete anything — tell the user to do those in the app.`,
  inputSchema: z.object({
    name: z.string().trim().min(1).describe('Display name / title of the bookmark.'),
    url: z.string().trim().min(1).describe('The URL to save.'),
  }),
  execute: async ({ name, url }) => {
    return {
      created: await createBookmark({ type: 'bookmark', name, url }),
    }
  },
})

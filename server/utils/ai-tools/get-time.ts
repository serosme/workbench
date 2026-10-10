import { tool } from 'ai'
import { z } from 'zod'

export const getTime = tool({
  description: 'Get the current date and time.',
  inputSchema: z.object({}),
  execute: async () => {
    const now = new Date()

    return {
      iso: now.toISOString(),
      local: now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    }
  },
})

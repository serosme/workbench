import { tool } from 'ai'
import { z } from 'zod'

export const insertExpense = tool({
  description: `Insert a new expense record. Use this when the user asks you to record or log a purchase.
The amount is in YUAN (e.g. 12.5 means ¥12.50); it is converted to cents on the server. The date is a "YYYY-MM-DD" string in Asia/Shanghai; omit it to use today. This tool only inserts — it cannot edit or delete an existing expense, so tell the user to do that in the app.`,
  inputSchema: z.object({
    item: z.string().describe('What the money was spent on.'),
    amount: z.number().positive().describe('Amount in yuan, e.g. 12.5 for ¥12.50.'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Spent date as YYYY-MM-DD; defaults to today.'),
  }),
  execute: async ({ item, amount, date }) => {
    return await createExpense({
      item,
      amount: Math.round(amount * 100),
      spentAt: dateKeyToMs(date ?? toDateKey(Date.now())),
    })
  },
})

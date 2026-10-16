import { tool } from 'ai'
import { z } from 'zod'

export const addExpense = tool({
  description: `Add an expense record. Use it when the user asks you to record or log a purchase.

Always ask for confirmation first: tell the user exactly what you are about to save, and call this tool only after they agree.

Parameters:
- item: what the money was spent on, e.g. "coffee" or "地铁".
- amountYuan: the amount in yuan, e.g. 12.5 for ¥12.50. It is converted to cents on the server, so pass yuan — never cents.
- spentDate: the date the money was spent, as YYYY-MM-DD in Asia/Shanghai; omit it to use today. It is the group the record shows up under in the app, not the storage time.

This tool only adds: it cannot edit or delete an existing expense, so tell the user to do that in the app.`,
  inputSchema: z.object({
    item: z.string().describe('What the money was spent on.'),
    amountYuan: z.number().positive().describe('Amount in yuan, e.g. 12.5 for ¥12.50.'),
    spentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Spent date as YYYY-MM-DD; defaults to today.'),
  }),
  execute: async ({ item, amountYuan, spentDate }) => {
    return {
      created: await createExpense({
        item,
        amount: Math.round(amountYuan * 100),
        spentAt: dateKeyToMs(spentDate ?? toDateKey(Date.now())),
      }),
    }
  },
})

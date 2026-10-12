import { tool } from 'ai'
import { z } from 'zod'

// 返回给模型的上限：行数 + 字符数双保险。模型自己写 LIMIT，这里再兜一道——既防 `SELECT *` 把整表灌进上下文，
// 也防「行数不多但每行很宽」（如 SELECT content FROM notes）撑爆上下文
const MAX_ROWS = 200
const MAX_CHARS = 20_000

// 给模型看的「数据库文档」：表结构 + 关键语义（金额单位、日期单位、排序模型），改表结构时要同步维护
const SCHEMA = `Tables:
- bookmarks(id INTEGER PK, parentId INTEGER NULL, type TEXT 'folder'|'bookmark', name TEXT, url TEXT NULL, position INTEGER)
  Rows are grouped by (parentId, type); within a group folders sort before bookmarks, then by position. parentId NULL means root level.
- notes(id INTEGER PK, title TEXT, content TEXT, writtenAt INTEGER)
  writtenAt is the note's date stored as epoch milliseconds at Asia/Shanghai midnight. Newest first is writtenAt DESC, id DESC.
- expenses(id INTEGER PK, item TEXT, amount INTEGER, spentAt INTEGER)
  amount is in CENTS, not yuan (divide by 100 to get yuan). spentAt is the date stored as epoch milliseconds at Asia/Shanghai midnight.

Dates: all dates live as Asia/Shanghai-midnight epoch milliseconds. To group by day use date(spentAt / 1000, 'unixepoch', '+8 hours') (YYYY-MM-DD) and by month use strftime('%Y-%m', spentAt / 1000, 'unixepoch', '+8 hours') (YYYY-MM).`

// 只读守卫到得了的写路径只有 `WITH ... <write>`（开头已限定 SELECT / WITH），抵达的写动词就是 INSERT / UPDATE / DELETE。
// REPLACE INTO 单独判：REPLACE(...) 是 SQLite 常用字符串函数，不能整词拉黑。
const WRITE_KEYWORDS = /\b(?:insert|update|delete)\b/i
const REPLACE_INTO = /\breplace\s+into\b/i

// 把字符串字面量（单引号）、带引号标识符（双引号）与注释替换成空格，避免其中的关键字造成误判
function stripLiteralsAndComments(sql: string): string {
  return sql
    .replace(/'(?:[^']|'')*'/g, ' ')
    .replace(/"(?:[^"]|"")*"/g, ' ')
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
}

// 通用只读查询：一条 SELECT / WITH 语句，模型自己写 SQL。其余语句一律拒绝
export const queryDatabase = tool({
  description: `Run a single read-only SQLite query against the app database and return the rows as JSON. Only SELECT (or WITH ... SELECT) statements are allowed; INSERT / UPDATE / DELETE and DDL are always rejected. Always include a LIMIT.

This database holds the user's bookmarks, notes and expenses and is the source of truth. Do the work in SQL and let the database compute — do NOT fetch raw rows and calculate yourself:
- Aggregation: SUM / COUNT / AVG / MIN / MAX with GROUP BY, ORDER BY, HAVING (e.g. total spend per month).
- Money: amounts are stored in cents; compute SUM(amount) / 100.0 in SQL to get yuan.
- Search / filter: use LIKE with % wildcards, e.g. WHERE item LIKE '%coffee%' (case-insensitive for ASCII).
- Rank / dedupe: ORDER BY ... DESC LIMIT n, DISTINCT, or a subquery to pick the max/min row.
- Hierarchy: bookmarks form a tree via parentId; use a recursive CTE (WITH RECURSIVE) to walk it (e.g. every descendant of a folder) instead of expanding it yourself.
- Dates: bucket by day/month with the date functions below instead of grouping rows yourself.
- Be efficient: when several aggregates share the same filter, compute them in ONE query (multiple SUM(...) columns or a GROUP BY) instead of several round trips.
Only return raw rows when you genuinely need the individual records, and still cap them with LIMIT.

${SCHEMA}`,
  inputSchema: z.object({
    sql: z.string().describe('A single SELECT or WITH ... SELECT statement. Always add a LIMIT.'),
  }),
  execute: async ({ sql }) => {
    const statement = sql.trim().replace(/;\s*$/, '')

    if (!/^(?:select|with)\b/i.test(statement))
      return { error: 'Only SELECT / WITH ... SELECT queries are allowed.' }
    if (statement.includes(';'))
      return { error: 'Only a single statement is allowed.' }
    const stripped = stripLiteralsAndComments(statement)
    if (WRITE_KEYWORDS.test(stripped) || REPLACE_INTO.test(stripped))
      return { error: 'Only read-only queries are allowed; INSERT / UPDATE / DELETE and DDL are rejected.' }

    // SQL 由模型生成，语法错是常态：把错误回传给它自己纠正（本项目唯一刻意 catch 的地方）
    try {
      const rows = await db.all(statement) as Record<string, unknown>[]

      // 先按行数截断，再按字符数截断；至少保留一行，避免单行超预算时整条结果为空
      const limited: Record<string, unknown>[] = []
      let size = 0
      for (const row of rows.slice(0, MAX_ROWS)) {
        const rowSize = JSON.stringify(row).length
        if (limited.length > 0 && size + rowSize > MAX_CHARS)
          break
        limited.push(row)
        size += rowSize
      }

      return {
        rowCount: rows.length,
        truncated: limited.length < rows.length,
        rows: limited,
      }
    }
    catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  },
})

import { DateFormatter, fromDateToLocal, getLocalTimeZone, parseDate, toCalendarDate } from '@internationalized/date'

const dateFormatter = new DateFormatter('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const monthFormatter = new DateFormatter('en-US', { year: 'numeric', month: 'long' })

// 按本地时区取「YYYY-MM-DD」，既是分组键，也是 <UInputDate> 的字面量
export function toDateKey(ms: number): string {
  return toCalendarDate(fromDateToLocal(new Date(ms))).toString()
}

// 消费/书写只精确到天：把「YYYY-MM-DD」还原成当天本地零点的毫秒时间戳
export function dateKeyToMs(value: string): number {
  return parseDate(value).toDate(getLocalTimeZone()).getTime()
}

// 展示用：「YYYY-MM-DD」→ "Oct 9, 2026"
export function formatDateKey(value: string): string {
  return dateFormatter.format(parseDate(value).toDate(getLocalTimeZone()))
}

// 展示用：「YYYY-MM」→ "October 2026"
export function formatMonthKey(value: string): string {
  return monthFormatter.format(parseDate(`${value}-01`).toDate(getLocalTimeZone()))
}

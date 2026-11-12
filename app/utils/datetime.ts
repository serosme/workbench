import { DateFormatter, fromDateToLocal, getLocalTimeZone, parseDate, toCalendarDate } from '@internationalized/date'

const dateFormatter = new DateFormatter('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
const monthFormatter = new DateFormatter('en-US', { year: 'numeric', month: 'long' })

export function msToDateKey(ms: number): string {
  return toCalendarDate(fromDateToLocal(new Date(ms))).toString()
}

export function dateKeyToMs(value: string): number {
  return parseDate(value).toDate(getLocalTimeZone()).getTime()
}

export function formatDateKey(value: string): string {
  return dateFormatter.format(parseDate(value).toDate(getLocalTimeZone()))
}

export function formatMonthKey(value: string): string {
  return monthFormatter.format(parseDate(`${value}-01`).toDate(getLocalTimeZone()))
}

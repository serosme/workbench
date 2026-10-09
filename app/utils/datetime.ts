function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// 按本地时区取「YYYY-MM-DD」，既是分组键，也是 <UInputDate> 的字面量
export function toDateKey(ms: number): string {
  const d = new Date(ms)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 消费只精确到天：把日期字符串还原成当天本地零点的毫秒时间戳
export function dateKeyToMs(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year!, month! - 1, day!).getTime()
}

// 展示用：把「YYYY-MM-DD」格式化成英文短格式，如 "Oct 9, 2026"
export function formatDateKey(value: string): string {
  return new Date(dateKeyToMs(value)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// 展示用：把「YYYY-MM」格式化成英文月份，如 "October 2026"
export function formatMonthKey(value: string): string {
  const [year, month] = value.split('-').map(Number)
  return new Date(year!, month! - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
}

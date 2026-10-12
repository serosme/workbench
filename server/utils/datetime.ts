const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000

export function dateKeyToMs(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map(Number)
  return Date.UTC(year!, month! - 1, day!) - SHANGHAI_OFFSET_MS
}

export function toDateKey(ms: number): string {
  const shifted = new Date(ms + SHANGHAI_OFFSET_MS)
  const month = String(shifted.getUTCMonth() + 1).padStart(2, '0')
  const day = String(shifted.getUTCDate()).padStart(2, '0')
  return `${shifted.getUTCFullYear()}-${month}-${day}`
}

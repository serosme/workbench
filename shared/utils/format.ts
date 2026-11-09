// 字节数 → 人类可读（1.5MB）：客户端展示文件大小、服务端拼 413 文案都用它，所以放在 shared 里
export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(unit === 0 ? 0 : 1).replace(/\.0$/, '')}${units[unit]}`
}

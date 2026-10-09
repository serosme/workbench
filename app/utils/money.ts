// 金额以「分」存储，界面输入输出都走这两个转换，避免任何地方直接做 元 的浮点运算
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

export function parseAmount(value: string): number {
  return Math.round(Number.parseFloat(value) * 100)
}

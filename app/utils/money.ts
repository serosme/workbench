// 金额以「分」存储，展示与表单回填统一走 formatAmount，输入侧交给 UInputNumber
export function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2)
}

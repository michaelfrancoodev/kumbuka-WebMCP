export function formatTSh(amount: number): string {
  return `TSh ${amount.toLocaleString('en-US')}`
}

export function formatTShShort(amount: number): string {
  if (amount >= 1000000) {
    const m = amount / 1000000
    return `TSh ${m % 1 === 0 ? m.toFixed(0) : m.toFixed(1)}M`
  }
  if (amount >= 1000) {
    const k = amount / 1000
    return `TSh ${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`
  }
  return `TSh ${amount}`
}

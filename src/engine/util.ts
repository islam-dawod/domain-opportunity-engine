let counter = 0
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}`
}

// Deterministic seeded PRNG (mulberry32) so a given prompt yields a stable candidate set.
export function makeRng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)]
export const rint = (rng: () => number, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min
export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n))

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'עכשיו'
  if (m < 60) return `לפני ${m} דק׳`
  const h = Math.round(m / 60)
  if (h < 24) return `לפני ${h} שע׳`
  return `לפני ${Math.round(h / 24)} ימים`
}

export function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'עכשיו'
  if (m < 60) return `בעוד ${m} דק׳`
  const h = Math.round(m / 60)
  if (h < 24) return `בעוד ${h} שע׳`
  return `בעוד ${Math.round(h / 24)} ימים`
}

export function money(amount: number, currency: string): string {
  const sym = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '₪'
  return `${sym}${amount.toLocaleString('en-US')}`
}

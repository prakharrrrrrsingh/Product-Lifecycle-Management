function parse(v: string): [number, number, number] {
  const parts = v.replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function compareSemVer(a: string, b: string): number {
  const [aMaj, aMin, aPat] = parse(a)
  const [bMaj, bMin, bPat] = parse(b)
  if (aMaj !== bMaj) return aMaj > bMaj ? 1 : -1
  if (aMin !== bMin) return aMin > bMin ? 1 : -1
  if (aPat !== bPat) return aPat > bPat ? 1 : -1
  return 0
}

export function getVersionBumpType(
  oldVer: string,
  newVer: string,
): 'major' | 'minor' | 'patch' | 'same' {
  const [oMaj, oMin, oPat] = parse(oldVer)
  const [nMaj, nMin, nPat] = parse(newVer)
  if (nMaj !== oMaj) return 'major'
  if (nMin !== oMin) return 'minor'
  if (nPat !== oPat) return 'patch'
  return 'same'
}

export function sortBySemVer<T>(
  items: T[],
  getVersion: (item: T) => string,
  descending = true,
): T[] {
  return [...items].sort((a, b) => {
    const cmp = compareSemVer(getVersion(a), getVersion(b))
    return descending ? -cmp : cmp
  })
}

export function isNewerVersion(candidate: string, baseline: string): boolean {
  return compareSemVer(candidate, baseline) > 0
}

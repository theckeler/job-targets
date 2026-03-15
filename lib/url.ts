export function cleanJobUrl(raw: string): string {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) return ''

  try {
    const u = new URL(trimmed)
    u.hash = ''

    // Remove common tracking params. Keep anything else to avoid breaking job-board routing.
    const drop = (key: string) =>
      key.startsWith('utm_') ||
      key === 'gh_src' ||
      key === 'lever-source' ||
      key === 'lever-source[]' ||
      key === 'iis' ||
      key === 'iisn' ||
      key === 'trk' ||
      key === 'fbclid' ||
      key === 'gclid' ||
      key === 'mc_cid' ||
      key === 'mc_eid'

    for (const key of [...u.searchParams.keys()]) {
      if (drop(key)) u.searchParams.delete(key)
    }

    return u.toString()
  } catch {
    return trimmed
  }
}


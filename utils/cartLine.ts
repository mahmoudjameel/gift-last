/** Stable signature so cart lines merge only when product + chosen options match. */
export function selectedOptionsSignature(sel?: Record<string, string> | null): string {
  if (!sel || typeof sel !== 'object') return '';
  const keys = Object.keys(sel).filter((k) => typeof sel[k] === 'string');
  if (keys.length === 0) return '';
  keys.sort();
  const normalized: Record<string, string> = {};
  for (const k of keys) normalized[k] = sel[k]!;
  return JSON.stringify(normalized);
}

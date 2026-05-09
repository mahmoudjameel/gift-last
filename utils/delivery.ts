import { formatDeliverySlotDisplay, isIsoDateTimeString } from '@/utils/merchantSchedulePickers';

/** One delivery time window (hour-based); `name` optional for legacy Firestore rows. */
export type DeliveryPeriodSlot = { from: string; to: string; name?: string };

function formatPeriodEndpoint(s: string, language: 'ar' | 'he'): string {
  const t = s.trim();
  if (!t) return '';
  if (isIsoDateTimeString(t)) return formatDeliverySlotDisplay(t, language);
  return t;
}

export function formatDeliveryPeriodLabel(
  p: DeliveryPeriodSlot,
  language: 'ar' | 'he' = 'ar'
): string {
  const from = (p.from || '').trim();
  const to = (p.to || '').trim();
  if (from && to) {
    const a = formatPeriodEndpoint(from, language);
    const b = formatPeriodEndpoint(to, language);
    return `${a} — ${b}`;
  }
  return (p.name || '').trim() || '—';
}

export function summarizeDeliveryPeriods(
  periods: DeliveryPeriodSlot[],
  language: 'ar' | 'he' = 'ar'
): string {
  return periods
    .map((p) => formatDeliveryPeriodLabel(p, language))
    .filter((s) => s && s !== '—')
    .join(' / ');
}

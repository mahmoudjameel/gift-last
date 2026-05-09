const ISO_LIKE = /^\d{4}-\d{2}-\d{2}T/;

export function isIsoDateTimeString(s: string): boolean {
  if (!s || !ISO_LIKE.test(s.trim())) return false;
  const d = new Date(s.trim());
  return !Number.isNaN(d.getTime());
}

export function parseDeliverySlotValue(raw: string): Date {
  const s = raw.trim();
  if (s && isIsoDateTimeString(s)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date();
  d.setMinutes(0, 0, 0);
  if (d.getHours() >= 22) d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

function normalizeArabicIndicDigits(str: string): string {
  const map: Record<string, string> = {
    '٠': '0',
    '١': '1',
    '٢': '2',
    '٣': '3',
    '٤': '4',
    '٥': '5',
    '٦': '6',
    '٧': '7',
    '٨': '8',
    '٩': '9',
  };
  return str.replace(/[٠-٩]/g, (ch) => map[ch] ?? ch);
}

export function parseBranchTimeValue(raw: string, defaultHour: number, defaultMinute: number): Date {
  const s = normalizeArabicIndicDigits(raw.trim());
  if (!s) {
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(defaultHour, defaultMinute, 0, 0);
    return d;
  }
  const match = s.match(/(\d{1,2})\s*:\s*(\d{2})/);
  let h = defaultHour;
  let m = defaultMinute;
  if (match) {
    h = parseInt(match[1], 10);
    m = parseInt(match[2], 10);
    const upper = s.toUpperCase();
    const isPM = /\bPM\b/i.test(s) || /م\s*$/.test(raw.trim());
    const isAM = /\bAM\b/i.test(s) || /ص\s*$/.test(raw.trim());
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
  }
  const d = new Date();
  d.setSeconds(0, 0);
  d.setHours(Math.min(23, Math.max(0, h)), Math.min(59, Math.max(0, m)), 0, 0);
  return d;
}

export function formatDeliverySlotIso(d: Date): string {
  return d.toISOString();
}

export function formatBranchTimeDisplay(d: Date, language: 'ar' | 'he'): string {
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'he-IL', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

export function formatDeliverySlotDisplay(iso: string, language: 'ar' | 'he'): string {
  const s = iso.trim();
  if (!s) return '';
  if (!isIsoDateTimeString(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'he-IL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
}

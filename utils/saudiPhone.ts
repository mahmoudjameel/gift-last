/**
 * يحوّل أرقام الجوال السعودية إلى E.164 كما تتوقع واجهات OTP (مثل Authentica):
 * يجب أن يبدأ الرقم بـ + ثم رمز الدولة.
 *
 * يقبل: 05XXXXXXXX، 5XXXXXXXX، 9665XXXXXXXX، +9665XXXXXXXX
 */
export function toSaudiE164(phone: string): string | null {
  const d = String(phone || '')
    .trim()
    .replace(/\s/g, '')
    .replace(/^\+/, '')
    .replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('966') && d.length >= 12) {
    return `+${d.slice(0, 12)}`;
  }
  if (d.startsWith('05') && d.length === 10) {
    return `+966${d.slice(1)}`;
  }
  if (d.length === 9 && d.startsWith('5')) {
    return `+966${d}`;
  }
  return null;
}

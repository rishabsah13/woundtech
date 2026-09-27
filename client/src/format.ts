const DAY = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** <input type="datetime-local"> needs local time as YYYY-MM-DDTHH:mm (toISOString would give UTC). */
export const toDatetimeLocal = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

export const formatTime = (iso: string) => timeFmt.format(new Date(iso));

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Local calendar-day key, so visits group by the viewer's day, not the UTC day. */
export const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function dayLabel(iso: string, now = new Date()) {
  const diff = Math.round((startOfDay(now) - startOfDay(new Date(iso))) / DAY);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return dayFmt.format(new Date(iso));
}

export function relativeTime(iso: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < DAY / 1000) return rtf.format(Math.round(seconds / 3600), 'hour');
  return rtf.format(Math.round(seconds / 86_400), 'day');
}

/** Wound care usually means at least weekly visits; flag anyone not seen in 7+ days. */
export const OVERDUE_DAYS = 7;
export const isOverdue = (lastVisitAt: string | null, now = Date.now()) =>
  lastVisitAt !== null && now - new Date(lastVisitAt).getTime() > OVERDUE_DAYS * DAY;

/** "Dr. Asha Rao" -> "AR", "Daniel Kim, NP" -> "DK": drop titles and credentials. */
export function initials(name: string) {
  const words = name
    .split(',')[0]
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
    .trim()
    .split(/\s+/);
  return ((words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)![0] : '')).toUpperCase();
}

export const isSameLocalDay = (iso: string, now = new Date()) => dayKey(iso) === dayKey(now.toISOString());
export const isWithinDays = (iso: string, days: number, now = Date.now()) =>
  now - new Date(iso).getTime() <= days * DAY;
export function getMondayOf(weekOffset: number): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function isToday(d: Date): boolean {
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

export function fmtShort(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function fmtWeekday(d: Date): string {
  return d.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase();
}

export function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

// Convert an ISO timestamp (or already-formatted HH:MM) to local HH:MM
export function toLocalTime(value?: string): string {
  if (!value) return '';
  // Already HH:MM — pass through
  if (/^\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function minsToHours(from?: string, to?: string): string {
  const f = toLocalTime(from), t = toLocalTime(to);
  if (!f || !t) return '0h';
  const [fh, fm] = f.split(':').map(Number);
  const [th, tm] = t.split(':').map(Number);
  if (isNaN(fh) || isNaN(fm) || isNaN(th) || isNaN(tm)) return '0h';
  const mins = Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
  const h = Math.floor(mins / 60), m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function signalStrength(from?: string, to?: string): number {
  if (!from || !to) return 1;
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  if (isNaN(fh) || isNaN(fm) || isNaN(th) || isNaN(tm)) return 1;
  const mins = Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
  if (mins < 120) return 1;
  if (mins < 240) return 2;
  if (mins < 360) return 3;
  return 4;
}

// Returns ISO week number for a date (Mon-based)
export function isoWeek(d: Date): { year: number; week: number } {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const jan4 = new Date(tmp.getFullYear(), 0, 4);
  const week = 1 + Math.round(((tmp.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { year: tmp.getFullYear(), week };
}

// Format offset as "2026-W34" or "2026-08"
export function offsetToWeekParam(offset: number): string {
  const monday = getMondayOf(offset);
  const { year, week } = isoWeek(monday);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function offsetToMonthParam(monthOffset: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + monthOffset;
  const date = new Date(year, month, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Parse "2026-W34" back to a week offset relative to today
export function weekParamToOffset(param: string): number {
  const m = param.match(/^(\d{4})-W(\d{1,2})$/);
  if (!m) return 0;
  const year = parseInt(m[1]), week = parseInt(m[2]);
  // Find Monday of that ISO week
  const jan4 = new Date(year, 0, 4);
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (week - 1) * 7);
  const todayMonday = getMondayOf(0);
  return Math.round((monday.getTime() - todayMonday.getTime()) / (7 * 86400000));
}

// Parse "2026-08" back to a month offset relative to today
export function monthParamToOffset(param: string): number {
  const m = param.match(/^(\d{4})-(\d{2})$/);
  if (!m) return 0;
  const year = parseInt(m[1]), month = parseInt(m[2]) - 1;
  const now = new Date();
  return (year - now.getFullYear()) * 12 + (month - now.getMonth());
}

export function toISODateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function weekRangeForOffset(offset: number): { start: Date; end: Date } {
  const monday = getMondayOf(offset);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

export function monthRangeForOffset(monthOffset: number): { start: Date; end: Date; year: number; month: number } {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = date.getFullYear(), month = date.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, year, month };
}

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

export function minsToHours(from?: string, to?: string): string {
  if (!from || !to) return '0h';
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
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

export function monthRangeForOffset(offset: number): { start: Date; end: Date; year: number; month: number } {
  const monday = getMondayOf(offset);
  const year = monday.getFullYear(), month = monday.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end, year, month };
}

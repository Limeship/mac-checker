import type { PresenceEntry, PersonWithDevices } from './types';

// All requests go to /api/* — proxied to the backend by server.ts
const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// Emoji overrides — hardcoded per person name
const EMOJI_MAP: Record<string, string> = {
  // 'Alice K.': '🧑‍💻',
};

function emoji(name: string): string {
  return EMOJI_MAP[name] ?? '👤';
}

// ── CALENDAR ──

export async function fetchPresence(start: Date, end: Date): Promise<PresenceEntry[]> {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  return get<PresenceEntry[]>(`/presence?${params}`);
}

// ── PEOPLE & DEVICES ──

export async function fetchPeopleWithDevices(): Promise<PersonWithDevices[]> {
  const raw = await get<Array<{
    id: string;
    name: string;
    devices: Array<{ id: string; description: string; mac: string; online: boolean; lastSeen?: string }>;
  }>>('/people');

  return raw.map(u => ({
    id: u.id,
    name: u.name,
    emoji: emoji(u.name),
    devices: u.devices.map(d => ({
      id: d.id,
      description: d.description,
      mac: d.mac,
      user: u.id,
      userName: u.name,
      online: d.online,
      lastSeen: d.lastSeen,
    })),
  }));
}

// ── STATS ──

export interface StatsResult {
  daysInOffice:      Array<{ userId: string; userName: string; days: number }>;
  hoursOnline:       Array<{ userId: string; userName: string; hours: number }>;
  earliestAvg:       Array<{ userId: string; userName: string; time: string }>;
  latestAvg:         Array<{ userId: string; userName: string; time: string }>;
  avgHoursPerDay:    Array<{ userId: string; userName: string; hours: number }>;
  longestStreak:     Array<{ userId: string; userName: string; days: number }>;
  mostConsistentDay: Array<{ userId: string; userName: string; weekday: string }>;
  deviceUptime:      Array<{ deviceId: string; deviceDesc: string; userName: string; pct: number }>;
  multiDeviceDays:   Array<{ userId: string; userName: string; days: number }>;
  peakOfficeDay:     { weekday: string; avgPeople: number };
}

export async function fetchStats(start: Date, end: Date): Promise<StatsResult> {
  const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
  const raw = await get<{ presence: any[]; deviceRows: any[]; multiRows: any[] }>(`/stats?${params}`);
  return computeStats(raw.presence, raw.deviceRows, raw.multiRows, start, end);
}

function computeStats(
  rows: any[],
  deviceRows: any[],
  multiRows: any[],
  start: Date,
  end: Date,
): StatsResult {
  const byUser = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!byUser.has(row.userId)) byUser.set(row.userId, []);
    byUser.get(row.userId)!.push(row);
  }

  const daysInOffice:      StatsResult['daysInOffice']      = [];
  const hoursOnline:       StatsResult['hoursOnline']       = [];
  const earliestAvg:       StatsResult['earliestAvg']       = [];
  const latestAvg:         StatsResult['latestAvg']         = [];
  const avgHoursPerDay:    StatsResult['avgHoursPerDay']    = [];
  const longestStreak:     StatsResult['longestStreak']     = [];
  const mostConsistentDay: StatsResult['mostConsistentDay'] = [];

  for (const [userId, userRows] of byUser.entries()) {
    const userName  = userRows[0].userName;
    const days      = userRows.length;
    const totalMins = userRows.reduce((s: number, r: any) => s + (r.minutes ?? 0), 0);

    const earliestMins = userRows.map((r: any) => { const [h,m] = r.firstTime.split(':').map(Number); return h*60+m; });
    const latestMins   = userRows.map((r: any) => { const [h,m] = r.lastTime.split(':').map(Number);  return h*60+m; });
    const avgEarliest  = Math.round(earliestMins.reduce((a: number, b: number) => a+b, 0) / earliestMins.length);
    const avgLatest    = Math.round(latestMins.reduce((a: number, b: number) => a+b, 0) / latestMins.length);

    const sortedDays = userRows.map((r: any) => r.day).sort();
    let streak = 1, maxStreak = 1;
    for (let i = 1; i < sortedDays.length; i++) {
      const diff = (new Date(sortedDays[i]).getTime() - new Date(sortedDays[i-1]).getTime()) / 86400000;
      if (diff === 1) { streak++; maxStreak = Math.max(maxStreak, streak); }
      else streak = 1;
    }

    const weekdayCounts = [0,0,0,0,0];
    for (const r of userRows) {
      const dow = new Date(r.day).getDay();
      if (dow >= 1 && dow <= 5) weekdayCounts[dow-1]++;
    }
    const weekdays = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const bestDay  = weekdays[weekdayCounts.indexOf(Math.max(...weekdayCounts))];

    daysInOffice.push({ userId, userName, days });
    hoursOnline.push({ userId, userName, hours: Math.round(totalMins/60*10)/10 });
    earliestAvg.push({ userId, userName, time: minsToTime(avgEarliest) });
    latestAvg.push({ userId, userName, time: minsToTime(avgLatest) });
    avgHoursPerDay.push({ userId, userName, hours: Math.round(totalMins/days/60*10)/10 });
    longestStreak.push({ userId, userName, days: maxStreak });
    mostConsistentDay.push({ userId, userName, weekday: bestDay });
  }

  daysInOffice.sort((a, b) => b.days - a.days);
  hoursOnline.sort((a, b) => b.hours - a.hours);
  earliestAvg.sort((a, b) => a.time.localeCompare(b.time));
  latestAvg.sort((a, b) => b.time.localeCompare(a.time));
  avgHoursPerDay.sort((a, b) => b.hours - a.hours);
  longestStreak.sort((a, b) => b.days - a.days);
  mostConsistentDay.sort((a, b) => a.userName.localeCompare(b.userName));

  const workingDays = countWorkingDays(start, end);
  const deviceUptime: StatsResult['deviceUptime'] = deviceRows
    .map((d: any) => ({ deviceId: d.deviceId, deviceDesc: d.deviceDesc, userName: d.userName, pct: Math.round(d.days/workingDays*100) }))
    .sort((a, b) => b.pct - a.pct);

  const multiDeviceCounts = new Map<string, { userName: string; days: number }>();
  for (const r of multiRows) {
    const cur = multiDeviceCounts.get(r.userId) ?? { userName: r.userName, days: 0 };
    cur.days++;
    multiDeviceCounts.set(r.userId, cur);
  }
  const multiDeviceDays: StatsResult['multiDeviceDays'] = [...multiDeviceCounts.entries()]
    .map(([userId, v]) => ({ userId, userName: v.userName, days: v.days }))
    .sort((a, b) => b.days - a.days);

  const weekdayTotals = [0,0,0,0,0];
  for (const row of rows) {
    const dow = new Date(row.day).getDay();
    if (dow >= 1 && dow <= 5) weekdayTotals[dow-1]++;
  }
  const weekOccurrences = countWeekdayOccurrences(start, end);
  const avgPerWeekday   = weekOccurrences.map((occ, i) => occ > 0 ? weekdayTotals[i]/occ : 0);
  const peakIdx         = avgPerWeekday.indexOf(Math.max(...avgPerWeekday));
  const weekdays        = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const peakOfficeDay   = { weekday: weekdays[peakIdx] ?? 'Monday', avgPeople: Math.round(avgPerWeekday[peakIdx]*10)/10 };

  return { daysInOffice, hoursOnline, earliestAvg, latestAvg, avgHoursPerDay, longestStreak, mostConsistentDay, deviceUptime, multiDeviceDays, peakOfficeDay };
}

function minsToTime(mins: number): string {
  const h = Math.floor(mins/60), m = mins%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

function countWorkingDays(start: Date, end: Date): number {
  let count = 0;
  const d = new Date(start);
  while (d <= end) { const dow = d.getDay(); if (dow>=1&&dow<=5) count++; d.setDate(d.getDate()+1); }
  return Math.max(count, 1);
}

function countWeekdayOccurrences(start: Date, end: Date): number[] {
  const counts = [0,0,0,0,0];
  const d = new Date(start);
  while (d <= end) { const dow = d.getDay(); if (dow>=1&&dow<=5) counts[dow-1]++; d.setDate(d.getDate()+1); }
  return counts;
}

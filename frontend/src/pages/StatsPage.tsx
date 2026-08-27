import { useState, useEffect } from 'react';
import { fetchStats, emoji, type StatsResult } from '../lib/db';

type Period = 'monthly' | 'yearly';

function periodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'monthly') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end:   new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end:   new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
}

function rankColor(i: number): string {
  if (i === 0) return '#F0C040';
  if (i === 1) return '#94A3B8';
  if (i === 2) return '#C08060';
  return 'var(--muted)';
}

function rankLabel(i: number) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return String(i + 1);
}

function Leaderboard({ title, rows, barColor, icon }: {
  title: string;
  rows: Array<{ name: string; value: string; pct: number }>;
  barColor: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
        {icon && <span style={{ color: barColor, opacity: 0.8 }}>{icon}</span>}
        <h3 className="section-header">{title}</h3>
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className="flex items-center gap-3 px-4 py-2.5 transition-colors border-b last:border-b-0"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <span className="text-[13px] w-6 text-center shrink-0" style={{ color: rankColor(i) }}>
              {rankLabel(i)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium mb-1.5 truncate" style={{ color: 'var(--text)' }}>
                {emoji(r.name)} {r.name}
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${r.pct}%`, background: barColor }} />
              </div>
            </div>
            <span className="font-mono text-[12px] shrink-0 tabular-nums" style={{ color: 'var(--muted)', minWidth: 48, textAlign: 'right' }}>
              {r.value}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <div className="px-4 py-6 text-center font-mono text-[12px]" style={{ color: 'var(--muted)' }}>No data</div>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, color, icon }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode;
}) {
  return (
    <div className="card px-5 py-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <div className="section-header mb-1">{label}</div>
        <div className="font-semibold text-[20px] font-mono leading-none" style={{ color: 'var(--text)' }}>{value}</div>
        {sub && <div className="font-mono text-[11px] mt-1" style={{ color: 'var(--muted)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function StatsPage() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [stats, setStats]   = useState<StatsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const { start, end } = periodRange(period);
    fetchStats(start, end).then(s => { setStats(s); setLoading(false); });
  }, [period]);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Controls */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="container flex items-center gap-2" style={{ height: 48 }}>
          <div className="flex gap-1">
            <button className={`btn ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>This month</button>
            <button className={`btn ${period === 'yearly'  ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>This year</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading || !stats ? (
          <div className="py-16 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : (
          <div className="container py-6 flex flex-col gap-5">

            {/* Summary tiles */}
            <div className="grid grid-cols-4 gap-4">
              <StatTile
                label="Top attender"
                value={stats.daysInOffice[0]?.userName ?? '—'}
                sub={`${stats.daysInOffice[0]?.days ?? 0} days in office`}
                color="var(--accent)"
                icon={<TrophyIcon />}
              />
              <StatTile
                label="Most hours"
                value={stats.hoursOnline[0]?.userName ?? '—'}
                sub={`${stats.hoursOnline[0]?.hours ?? 0}h online`}
                color="var(--accent2)"
                icon={<ClockIcon />}
              />
              <StatTile
                label="Peak day"
                value={stats.peakOfficeDay.weekday}
                sub={`avg ${stats.peakOfficeDay.avgPeople} people`}
                color="var(--accent)"
                icon={<CalIcon />}
              />
              <StatTile
                label="Longest streak"
                value={`${stats.longestStreak[0]?.days ?? 0}d`}
                sub={stats.longestStreak[0]?.userName ?? '—'}
                color="var(--accent2)"
                icon={<FlameIcon />}
              />
            </div>

            {/* Row 1 — Days + Hours */}
            <div className="grid grid-cols-2 gap-4">
              <Leaderboard
                title="Days in office"
                rows={stats.daysInOffice.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.daysInOffice[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<OfficeIcon />}
              />
              <Leaderboard
                title="Hours online"
                rows={stats.hoursOnline.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.hoursOnline[0]?.hours || 1) * 100 }))}
                barColor="var(--accent2)"
                icon={<ClockIcon />}
              />
            </div>

            {/* Row 2 — Arrival / Departure / Avg */}
            <div className="grid grid-cols-3 gap-4">
              <Leaderboard
                title="Earliest arrival (avg)"
                rows={stats.earliestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent)"
                icon={<SunriseIcon />}
              />
              <Leaderboard
                title="Latest departure (avg)"
                rows={stats.latestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent2)"
                icon={<SunsetIcon />}
              />
              <Leaderboard
                title="Avg hours / day"
                rows={stats.avgHoursPerDay.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.avgHoursPerDay[0]?.hours || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<ClockIcon />}
              />
            </div>

            {/* Row 3 — Streak + Consistent day */}
            <div className="grid grid-cols-2 gap-4">
              <Leaderboard
                title="Longest streak"
                rows={stats.longestStreak.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.longestStreak[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<FlameIcon />}
              />
              <div className="card overflow-hidden">
                <div className="px-4 pt-3.5 pb-2.5 flex items-center gap-2 border-b" style={{ borderColor: 'var(--border)' }}>
                  <span style={{ color: 'var(--accent2)', opacity: 0.8 }}><CalIcon /></span>
                  <h3 className="section-header">Most consistent day</h3>
                </div>
                <div className="flex flex-col">
                  {stats.mostConsistentDay.map((r, i) => (
                    <div
                      key={r.userId}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] transition-colors border-b last:border-b-0"
                      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] w-6 text-center shrink-0" style={{ color: rankColor(i) }}>{rankLabel(i)}</span>
                        <span className="truncate" style={{ color: 'var(--text)' }}>{emoji(r.userName)} {r.userName}</span>
                      </div>
                      <span
                        className="font-mono text-[10px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
                      >
                        {r.weekday}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Device uptime */}
            <Leaderboard
              title="Device uptime (% of working days)"
              rows={stats.deviceUptime.map(r => ({
                name: `${r.userName} · ${r.deviceDesc}`,
                value: `${r.pct}%`,
                pct: r.pct,
              }))}
              barColor="var(--accent2)"
              icon={<DeviceIcon />}
            />

            {/* Multi-device days */}
            {stats.multiDeviceDays.length > 0 && (
              <Leaderboard
                title="Days with multiple devices"
                rows={stats.multiDeviceDays.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.multiDeviceDays[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<DeviceIcon />}
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}

// ── Icons ──

function TrophyIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17c-3.3 0-6-2.7-6-6V3h12v8c0 3.3-2.7 6-6 6z"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>;
}
function ClockIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
function CalIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function FlameIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}
function OfficeIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function SunriseIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg>;
}
function SunsetIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="16 5 12 9 8 5"/></svg>;
}
function DeviceIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>;
}

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

function Leaderboard({ title, rows, barColor }: {
  title: string;
  rows: Array<{ name: string; value: string; pct: number }>;
  barColor: string;
}) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <h3 className="section-header">{title}</h3>
      </div>
      <div className="flex flex-col divide-y" style={{ '--tw-divide-opacity': 1, borderColor: 'var(--border)' } as React.CSSProperties}>
        {rows.map((r, i) => (
          <div
            key={r.name}
            className="flex items-center gap-3 px-4 py-3 transition-colors"
            style={{ background: 'var(--surface)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <span className="font-mono text-[11px] w-5 text-center shrink-0 font-semibold" style={{ color: rankColor(i) }}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium mb-1.5 truncate" style={{ color: 'var(--text)' }}>
                {emoji(r.name)} {r.name}
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${r.pct}%`, background: barColor }} />
              </div>
            </div>
            <span className="font-mono text-[12px] shrink-0 text-right" style={{ color: 'var(--muted)', minWidth: 52 }}>
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
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="container flex items-center gap-2 h-12">
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
          <div className="container py-6 flex flex-col gap-6">

            {/* Row 1 — Days + Hours */}
            <div className="grid grid-cols-2 gap-5">
              <Leaderboard
                title="Days in office"
                rows={stats.daysInOffice.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.daysInOffice[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
              />
              <Leaderboard
                title="Hours online"
                rows={stats.hoursOnline.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.hoursOnline[0]?.hours || 1) * 100 }))}
                barColor="var(--accent2)"
              />
            </div>

            {/* Row 2 — Arrival / Departure / Avg */}
            <div className="grid grid-cols-3 gap-5">
              <Leaderboard
                title="Earliest arrival (avg)"
                rows={stats.earliestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                barColor="var(--accent)"
              />
              <Leaderboard
                title="Latest departure (avg)"
                rows={stats.latestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                barColor="var(--accent2)"
              />
              <Leaderboard
                title="Avg hours / day"
                rows={stats.avgHoursPerDay.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.avgHoursPerDay[0]?.hours || 1) * 100 }))}
                barColor="var(--accent)"
              />
            </div>

            {/* Row 3 — Streak + Consistent day */}
            <div className="grid grid-cols-2 gap-5">
              <Leaderboard
                title="Longest streak"
                rows={stats.longestStreak.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.longestStreak[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
              />
              <div className="card overflow-hidden">
                <div className="px-4 pt-4 pb-2">
                  <h3 className="section-header">Most consistent day</h3>
                </div>
                <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                  {stats.mostConsistentDay.map(r => (
                    <div
                      key={r.userId}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] transition-colors"
                      style={{ background: 'var(--surface)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      <span style={{ color: 'var(--text)' }}>{emoji(r.userName)} {r.userName}</span>
                      <span
                        className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)' }}
                      >
                        {r.weekday}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Peak office day */}
            <div className="card px-6 py-5 flex items-center gap-4">
              <div>
                <h3 className="section-header mb-2">Peak office day</h3>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[28px] font-semibold" style={{ color: 'var(--accent)' }}>{stats.peakOfficeDay.weekday}</span>
                  <span className="font-mono text-[12px]" style={{ color: 'var(--muted)' }}>avg {stats.peakOfficeDay.avgPeople} people</span>
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
            />

            {/* Multi-device days */}
            {stats.multiDeviceDays.length > 0 && (
              <Leaderboard
                title="Days with multiple devices"
                rows={stats.multiDeviceDays.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.multiDeviceDays[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
              />
            )}

          </div>
        )}
      </div>
    </div>
  );
}

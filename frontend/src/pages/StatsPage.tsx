import { useState, useEffect } from 'react';
import { fetchStats, type StatsResult } from '../lib/db';

type Period = 'monthly' | 'yearly';

const EMOJI_MAP: Record<string, string> = {};
function emoji(name: string) { return EMOJI_MAP[name] ?? '👤'; }

function periodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  if (period === 'monthly') {
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
  return {
    start: new Date(now.getFullYear(), 0, 1),
    end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
  };
}

function rankColor(i: number) {
  if (i === 0) return 'text-[#F0C040]';
  if (i === 1) return 'text-[#94A3B8]';
  if (i === 2) return 'text-[#C08060]';
  return 'text-muted';
}

function Leaderboard({ rows, color, mono }: {
  rows: Array<{ name: string; value: string; pct: number }>;
  color: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col border border-border rounded-[2px] overflow-hidden">
      {rows.map((r, i) => (
        <div key={r.name} className="grid items-center gap-2.5 bg-surface px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-surface2 transition-colors" style={{gridTemplateColumns:'22px 1fr 72px'}}>
          <span className={`font-mono text-[10px] ${rankColor(i)}`}>{i + 1}</span>
          <div className="min-w-0">
            <div className="font-medium text-[12px] text-text mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{emoji(r.name)} {r.name}</div>
            <div className="bg-surface2 h-0.5 overflow-hidden">
              <div className="h-full transition-[width] duration-500" style={{ width: `${r.pct}%`, background: color }} />
            </div>
          </div>
          <span className={`font-mono text-[10px] text-muted text-right ${mono ? 'font-mono' : ''}`}>{r.value}</span>
        </div>
      ))}
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
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex items-center gap-3 h-11">
          <span className="font-mono text-[11px] font-medium text-muted tracking-[0.08em] uppercase">Statistics</span>
          <div className="flex gap-1.5">
            <button className={`btn btn-sm ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>This month</button>
            <button className={`btn btn-sm ${period === 'yearly'  ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>This year</button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {loading || !stats ? (
          <div className="py-16 text-center text-muted font-mono text-[11px]">Loading…</div>
        ) : (
          <div className="max-w-[1100px] mx-auto px-8 py-6 flex flex-col gap-7">

            <div className="grid grid-cols-2 gap-6">
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Days in office</h3>
                <Leaderboard
                  rows={stats.daysInOffice.map(r => ({ name: r.userName, value: `${r.days} days`, pct: r.days / (stats.daysInOffice[0]?.days || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Hours online</h3>
                <Leaderboard
                  rows={stats.hoursOnline.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.hoursOnline[0]?.hours || 1) * 100 }))}
                  color="var(--accent2)"
                />
              </section>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Earliest arrival (avg)</h3>
                <Leaderboard
                  rows={stats.earliestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                  color="var(--accent)" mono
                />
              </section>
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Latest departure (avg)</h3>
                <Leaderboard
                  rows={stats.latestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                  color="var(--accent2)" mono
                />
              </section>
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Avg hours / day present</h3>
                <Leaderboard
                  rows={stats.avgHoursPerDay.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.avgHoursPerDay[0]?.hours || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Longest streak</h3>
                <Leaderboard
                  rows={stats.longestStreak.map(r => ({ name: r.userName, value: `${r.days} days`, pct: r.days / (stats.longestStreak[0]?.days || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Most consistent day</h3>
                <div className="flex flex-col border border-border rounded-[2px] overflow-hidden">
                  {stats.mostConsistentDay.map(r => (
                    <div key={r.userId} className="flex items-center justify-between gap-2 bg-surface border-b border-border last:border-b-0 px-3 py-2.5 text-[12px]">
                      <span>{emoji(r.userName)} {r.userName}</span>
                      <span className="font-mono text-[9px] px-1.5 py-px rounded-[1px] bg-accent/12 text-accent border border-accent/30 tracking-[0.06em] uppercase">{r.weekday}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section>
              <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Peak office day</h3>
              <div className="bg-surface border border-border border-l-2 border-l-accent rounded-[2px] px-4 py-3.5 flex items-baseline gap-3 max-w-[240px]">
                <span className="font-mono text-[20px] font-medium text-accent">{stats.peakOfficeDay.weekday}</span>
                <span className="font-mono text-[10px] text-muted">avg {stats.peakOfficeDay.avgPeople} people</span>
              </div>
            </section>

            <section>
              <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Device uptime (% of working days)</h3>
              <div className="flex flex-col border border-border rounded-[2px] overflow-hidden">
                {stats.deviceUptime.map((r, i) => (
                  <div key={r.deviceId} className="grid items-center gap-2.5 bg-surface px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-surface2 transition-colors" style={{gridTemplateColumns:'22px 1fr 72px'}}>
                    <span className={`font-mono text-[10px] ${rankColor(i)}`}>{i + 1}</span>
                    <div className="min-w-0">
                      <div className="font-medium text-[12px] text-text mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                        <span>{emoji(r.userName)} {r.userName}</span>
                        <span className="font-mono text-[9px] text-muted ml-1.5">{r.deviceDesc}</span>
                      </div>
                      <div className="bg-surface2 h-0.5 overflow-hidden">
                        <div className="h-full transition-[width] duration-500" style={{ width: `${r.pct}%`, background: 'var(--accent2)' }} />
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-muted text-right">{r.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            {stats.multiDeviceDays.length > 0 && (
              <section>
                <h3 className="font-mono text-[9px] font-medium tracking-[0.12em] uppercase text-muted mb-2">Days with multiple devices</h3>
                <Leaderboard
                  rows={stats.multiDeviceDays.map(r => ({ name: r.userName, value: `${r.days} days`, pct: r.days / (stats.multiDeviceDays[0]?.days || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
            )}

          </div>
        )}
      </div>
    </div>
  );
}

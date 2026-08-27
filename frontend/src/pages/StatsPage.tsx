import { useState, useEffect, useRef } from 'react';
import { fetchStats, emoji, type StatsResult } from '../lib/db';

function InfoTooltip({ detail }: { detail: string }) {
  const [visible, setVisible] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLButtonElement>(null);

  function show() {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setPos({ x: r.right + 8, y: r.top - 4 });
    }
    setVisible(true);
  }

  return (
    <>
      <button
        ref={ref}
        onMouseEnter={show}
        onMouseLeave={() => setVisible(false)}
        className="shrink-0 flex items-center justify-center rounded-full border-0 bg-transparent cursor-help"
        style={{ width: 16, height: 16, color: 'var(--muted)' }}
        tabIndex={-1}
        aria-label="More info"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 7v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="8" cy="4.5" r="0.8" fill="currentColor"/>
        </svg>
      </button>
      {visible && (
        <div
          className="tooltip-box visible"
          style={{
            position: 'fixed',
            left: Math.min(pos.x, window.innerWidth - 240),
            top: pos.y,
            maxWidth: 220,
            fontSize: 12,
            lineHeight: 1.5,
            color: 'var(--text)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          {detail}
        </div>
      )}
    </>
  );
}

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

function Leaderboard({ title, subtitle, detail, rows, barColor, icon }: {
  title: string;
  subtitle?: string;
  detail?: string;
  rows: Array<{ name: string; value: string; pct: number }>;
  barColor: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col overflow-hidden">
      <div className="border-b" style={{ padding: '20px 20px 16px', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: barColor, opacity: 0.8 }}>{icon}</span>}
          <h3 className="section-header flex-1">{title}</h3>
          {detail && <InfoTooltip detail={detail} />}
        </div>
        {subtitle && <p className="font-mono text-[10px]" style={{ marginTop: 6, color: 'var(--muted)' }}>{subtitle}</p>}
      </div>
      <div className="flex flex-col">
        {rows.map((r, i) => (
          <div
            key={r.name}
            className="flex items-center transition-colors border-b last:border-b-0"
            style={{ gap: 12, padding: '14px 20px', borderColor: 'var(--border)', background: 'var(--surface)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <span className="text-[13px] w-6 text-center shrink-0" style={{ color: rankColor(i) }}>
              {rankLabel(i)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium truncate" style={{ marginBottom: 6, color: 'var(--text)' }}>
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
    <div className="card flex items-center" style={{ padding: '20px 24px', gap: 20 }}>
      <div className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
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
          <div className="container flex flex-col" style={{ paddingTop: 40, paddingBottom: 40, gap: 32 }}>

            {/* Summary tiles */}
            <div className="grid grid-cols-4" style={{ gap: 20 }}>
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
            <div className="grid grid-cols-2" style={{ gap: 24 }}>
              <Leaderboard
                title="Days in office"
                subtitle="Unique days with at least one device seen"
                detail="A day counts if any registered device was detected on the network that day. Multiple devices on the same day still count as one day."
                rows={stats.daysInOffice.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.daysInOffice[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<OfficeIcon />}
              />
              <Leaderboard
                title="Hours online"
                subtitle="Total time from first to last device ping"
                detail="Measured as the span from the earliest device ping to the latest on each day, then summed across all days. Reflects time in the office, not pure screen time."
                rows={stats.hoursOnline.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.hoursOnline[0]?.hours || 1) * 100 }))}
                barColor="var(--accent2)"
                icon={<ClockIcon />}
              />
            </div>

            {/* Row 2 — Arrival / Departure / Avg */}
            <div className="grid grid-cols-3" style={{ gap: 24 }}>
              <Leaderboard
                title="Earliest arrival (avg)"
                subtitle="Average time of first device ping"
                detail="Averaged across all days in the selected period. Earlier = more consistent early starts."
                rows={stats.earliestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent)"
                icon={<SunriseIcon />}
              />
              <Leaderboard
                title="Latest departure (avg)"
                subtitle="Average time of last device ping"
                detail="Averaged across all days in the selected period. Later = tends to stay in the office longer."
                rows={stats.latestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent2)"
                icon={<SunsetIcon />}
              />
              <Leaderboard
                title="Avg hours / day"
                subtitle="Average daily span when in office"
                detail="Total online hours divided by the number of days present. Gives a sense of typical session length, not total commitment."
                rows={stats.avgHoursPerDay.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.avgHoursPerDay[0]?.hours || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<ClockIcon />}
              />
            </div>

            {/* Row 2b — Earliest/Latest ever */}
            <div className="grid grid-cols-2" style={{ gap: 24 }}>
              <Leaderboard
                title="Earliest arrival (record)"
                subtitle="Single earliest arrival in the period"
                detail="The absolute earliest time this person was ever detected in the office during the selected period — not an average."
                rows={stats.earliestEver.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent)"
                icon={<SunriseIcon />}
              />
              <Leaderboard
                title="Latest departure (record)"
                subtitle="Single latest departure in the period"
                detail="The absolute latest time this person was ever detected in the office during the selected period — not an average."
                rows={stats.latestEver.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 12 }))}
                barColor="var(--accent2)"
                icon={<SunsetIcon />}
              />
            </div>

            {/* Row 3 — Streak + Consistent day */}
            <div className="grid grid-cols-2" style={{ gap: 24 }}>
              <Leaderboard
                title="Longest streak"
                subtitle="Most consecutive working days in office"
                detail="The longest run of back-to-back working days (Mon–Fri) with at least one device detected. Weekends don't break the streak."
                rows={stats.longestStreak.map(r => ({ name: r.userName, value: `${r.days}d`, pct: r.days / (stats.longestStreak[0]?.days || 1) * 100 }))}
                barColor="var(--accent)"
                icon={<FlameIcon />}
              />
              <div className="card overflow-hidden">
                <div className="border-b" style={{ padding: '20px 20px 16px', borderColor: 'var(--border)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: 'var(--accent2)', opacity: 0.8 }}><CalIcon /></span>
                    <h3 className="section-header flex-1">Most consistent day</h3>
                    <InfoTooltip detail="The weekday each person comes in most often. Useful for knowing which days to expect the team to be in." />
                  </div>
                  <p className="font-mono text-[10px]" style={{ marginTop: 6, color: 'var(--muted)' }}>Weekday with the most office visits</p>
                </div>
                <div className="flex flex-col">
                  {stats.mostConsistentDay.map((r, i) => (
                    <div
                      key={r.userId}
                      className="flex items-center justify-between text-[13px] transition-colors border-b last:border-b-0"
                      style={{ gap: 12, padding: '14px 20px', borderColor: 'var(--border)', background: 'var(--surface)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[13px] w-6 text-center shrink-0" style={{ color: rankColor(i) }}>{rankLabel(i)}</span>
                        <span className="truncate" style={{ color: 'var(--text)' }}>{emoji(r.userName)} {r.userName}</span>
                      </div>
                      <span
                        className="font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0"
                        style={{ padding: '4px 10px', borderRadius: 999, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}
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
              subtitle="How often each device was seen, out of all working days"
              detail="Percentage of working days in the period where this specific device was detected on the network at least once."
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
                subtitle="Days when more than one registered device was online"
                detail="Counts days where at least two of a person's registered devices were detected on the same day — e.g. a laptop and a phone both seen."
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

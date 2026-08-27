import React, { useState, useEffect, useCallback, useRef } from 'react';
import { fetchPresence, emoji } from '../lib/db';
import type { PresenceEntry } from '../lib/types';
import {
  getMondayOf, isToday, fmtShort, fmtWeekday, fmtMonthYear,
  minsToHours, weekRangeForOffset, monthRangeForOffset,
  toISODateStr,
} from '../lib/dateUtils';

type View = 'week' | 'month';

interface FilterState {
  people: Set<string>;
  devices: Set<string>;
}

interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  entries: Array<{
    emoji: string;
    name: string;
    device?: string;
    from: string;
    until: string;
    duration: string;
    color: string;
  }>;
}

function hoursRounded(from?: string, to?: string): string {
  if (!from || !to) return '0h';
  const [fh, fm] = from.split(':').map(Number);
  const [th, tm] = to.split(':').map(Number);
  if (isNaN(fh) || isNaN(fm) || isNaN(th) || isNaN(tm)) return '0h';
  const mins = Math.max(0, (th * 60 + tm) - (fh * 60 + fm));
  return `${Math.round(mins / 60)}h`;
}

export function CalendarPage() {
  const [view, setView]             = useState<View>('week');
  const [offset, setOffset]         = useState(0);
  const [entries, setEntries]       = useState<PresenceEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState<FilterState>({ people: new Set(), devices: new Set() });
  const [allPeople, setAllPeople]   = useState<string[]>([]);
  const [allDevices, setAllDevices] = useState<string[]>([]);
  const [tooltip, setTooltip]       = useState<TooltipData>({ visible: false, x: 0, y: 0, entries: [] });
  const tooltipRef                  = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = view === 'week' ? weekRangeForOffset(offset) : monthRangeForOffset(offset);
      const rawData = await fetchPresence(range.start, range.end);
      const data = Array.isArray(rawData) ? rawData : [];
      setEntries(data);

      const people  = new Set(data.map(e => e.userName).filter(Boolean));
      const devices = new Set(data.filter(e => e.type === 'device').map(e => e.deviceDesc ?? '').filter(Boolean));

      setFilter({ people, devices });
      setAllPeople([...people].sort());
      setAllDevices([...devices].sort());
    } finally {
      setLoading(false);
    }
  }, [view, offset]);

  useEffect(() => { load(); }, [load]);

  function togglePerson(name: string) {
    setFilter(prev => {
      const people = new Set(prev.people);
      if (people.has(name)) people.delete(name); else people.add(name);
      return { ...prev, people };
    });
  }

  function toggleDevice(desc: string) {
    setFilter(prev => {
      const devices = new Set(prev.devices);
      if (devices.has(desc)) devices.delete(desc); else devices.add(desc);
      const people = new Set(prev.people);
      for (const person of allPeople) {
        const personDevices = allDevices.filter(d => entries.some(e => e.userName === person && e.deviceDesc === d));
        const allOff = personDevices.length > 0 && personDevices.every(d => !devices.has(d));
        if (allOff) people.delete(person);
        else if (personDevices.some(d => devices.has(d))) people.add(person);
      }
      return { people, devices };
    });
  }

  function showTooltip(ev: React.MouseEvent, entries: TooltipData['entries']) {
    setTooltip({ visible: true, x: ev.clientX, y: ev.clientY, entries });
  }
  function moveTooltip(ev: React.MouseEvent) {
    setTooltip(t => ({ ...t, x: ev.clientX, y: ev.clientY }));
  }
  function hideTooltip() { setTooltip(t => ({ ...t, visible: false })); }

  const filteredEntries = entries.filter(e =>
    filter.people.has(e.userName) &&
    (e.type === 'robin' || filter.devices.has(e.deviceDesc ?? ''))
  );

  const uniquePeopleInView = [...new Set(filteredEntries.map(e => e.userName))].sort();

  // Tooltip position: keep inside viewport
  const TIP_W = 200, TIP_H = 120;
  const tipX = tooltip.x + 14 + TIP_W > window.innerWidth ? tooltip.x - TIP_W - 8 : tooltip.x + 14;
  const tipY = tooltip.y + 8 + TIP_H > window.innerHeight ? tooltip.y - TIP_H : tooltip.y + 8;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Controls */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="container flex items-center gap-2" style={{ height: 48 }}>
          <button className="btn-icon" onClick={() => setOffset(o => o - 1)} aria-label="Previous">
            <ChevronLeft />
          </button>
          <span className="font-mono text-[13px] font-medium min-w-[170px] text-center" style={{ color: 'var(--accent)' }}>
            {view === 'week'
              ? (() => {
                  const m = getMondayOf(offset);
                  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(m); d.setDate(m.getDate() + i); return d; });
                  return `${fmtShort(days[0])} – ${fmtShort(days[6])}`;
                })()
              : fmtMonthYear(getMondayOf(offset))
            }
          </span>
          <button className="btn-icon" onClick={() => setOffset(o => o + 1)} aria-label="Next">
            <ChevronRight />
          </button>
          <button className="btn" onClick={() => setOffset(0)}>Today</button>
          <div className="flex-1" />
          <div className="flex gap-1">
            <button className={`btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
            <button className={`btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          </div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="shrink-0 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="container flex flex-wrap gap-1.5 items-center min-h-[44px] py-2">
          <span className="section-header mr-1">People</span>
          {allPeople.map(name => (
            <button key={name} className={`chip ${filter.people.has(name) ? 'active' : ''}`} onClick={() => togglePerson(name)}>
              {emoji(name)} {name}
            </button>
          ))}
          {allDevices.length > 0 && (
            <>
              <div className="w-px h-4 mx-1" style={{ background: 'var(--border)' }} />
              <span className="section-header mr-1">Devices</span>
              {allDevices.map(d => (
                <button key={d} className={`chip ${filter.devices.has(d) ? 'active' : ''}`} onClick={() => toggleDevice(d)}>
                  {d}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="container pt-16 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>
            Loading…
          </div>
        ) : (
          <div className="container py-5">
            {view === 'week' ? (
              <WeekGrid
                offset={offset}
                entries={filteredEntries}
                visiblePeople={uniquePeopleInView}
                onHover={showTooltip}
                onMove={moveTooltip}
                onLeave={hideTooltip}
              />
            ) : (
              <MonthGrid
                offset={offset}
                entries={filteredEntries}
                onHover={showTooltip}
                onMove={moveTooltip}
                onLeave={hideTooltip}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="container flex items-center gap-4 font-mono text-[11px]" style={{ height: 36, color: 'var(--muted)' }}>
          <div className="flex items-center gap-3">
            <LegendDot color="var(--accent)" label="Device online" />
            <LegendDot color="var(--accent2)" label="Robin reservation" />
          </div>
          <span style={{ marginLeft: 'auto' }}>{uniquePeopleInView.length} {uniquePeopleInView.length === 1 ? 'person' : 'people'} · checks every 15 min</span>
        </div>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className={`tooltip-box ${tooltip.visible ? 'visible' : ''}`}
        style={{ left: tipX, top: tipY }}
      >
        {tooltip.entries.map((e, i) => (
          <div key={i} style={{ borderLeft: `3px solid ${e.color}`, paddingLeft: 10, marginBottom: i < tooltip.entries.length - 1 ? 10 : 0 }}>
            <div className="font-semibold text-[13px] mb-0.5" style={{ color: 'var(--text)' }}>{e.emoji} {e.name}</div>
            {e.device && <div className="font-mono text-[11px] mb-1" style={{ color: e.color }}>{e.device}</div>}
            <div className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{e.from} → {e.until}</div>
            <div className="font-mono text-[11px] font-medium mt-0.5" style={{ color: 'var(--text)' }}>{e.duration}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── WEEK GRID ──

function WeekGrid({ offset, entries, visiblePeople, onHover, onMove, onLeave }: {
  offset: number;
  entries: PresenceEntry[];
  visiblePeople: string[];
  onHover: (ev: React.MouseEvent, entries: TooltipData['entries']) => void;
  onMove: (ev: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const monday = getMondayOf(offset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="card overflow-hidden" style={{ minWidth: 600 }}>
      {/* Header row */}
      <div className="grid border-b" style={{ gridTemplateColumns: '160px repeat(7, 1fr)', borderColor: 'var(--border)' }}>
        <div className="px-3 py-2" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }} />
        {days.map((d, i) => (
          <div
            key={i}
            className="px-2 py-2 text-center"
            style={{
              borderRight: i < 6 ? '1px solid var(--border)' : undefined,
              background: isToday(d) ? 'var(--accent-dim)' : i >= 5 ? 'rgba(0,0,0,0.15)' : 'var(--surface)',
            }}
          >
            <div className="font-mono text-[10px] font-medium tracking-widest uppercase" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--muted)' }}>
              {fmtWeekday(d)}
            </div>
            <div className="font-mono text-[15px] font-semibold mt-0.5" style={{ color: isToday(d) ? 'var(--accent)' : 'var(--text)' }}>
              {d.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Person rows */}
      {visiblePeople.length === 0 ? (
        <div className="px-4 py-8 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>No data for this period</div>
      ) : visiblePeople.map((personName, ri) => {
        const personEntries = entries.filter(e => e.userName === personName);
        return (
          <div
            key={personName}
            className="grid"
            style={{
              gridTemplateColumns: '160px repeat(7, 1fr)',
              borderTop: ri > 0 ? '1px solid var(--border)' : undefined,
            }}
          >
            {/* Person label */}
            <div className="px-3 py-2.5 flex flex-col gap-1 justify-center" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface)' }}>
              <span className="font-medium text-[13px]" style={{ color: 'var(--text)' }}>{emoji(personName)} {personName}</span>
              <div className="flex flex-wrap gap-1">
                {[...new Set(personEntries.filter(e => e.type === 'device').map(e => e.deviceDesc))].map(d => (
                  <span key={d} className="font-mono text-[9px] px-1.5 py-px rounded" style={{ background: 'var(--muted2)', color: 'var(--muted)', border: '1px solid var(--border)' }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Day cells */}
            {days.map((d, di) => {
              const dayStr = toISODateStr(d);
              const dayEntries = personEntries.filter(e => (e.day || '').slice(0, 10) === dayStr);
              return (
                <div
                  key={di}
                  className="p-1.5 flex flex-col gap-1"
                  style={{
                    minHeight: 64,
                    borderRight: di < 6 ? '1px solid var(--border)' : undefined,
                    background: isToday(d) ? 'var(--accent-dim)' : di >= 5 ? 'rgba(0,0,0,0.12)' : undefined,
                    opacity: di >= 5 ? 0.7 : 1,
                  }}
                >
                  {dayEntries.map((e, ei) => {
                    const isRobin = e.type === 'robin';
                    const ttEntry = {
                      emoji: emoji(personName),
                      name: personName,
                      device: isRobin ? 'Robin (desk)' : e.deviceDesc,
                      from: e.firstTime,
                      until: e.lastTime,
                      duration: minsToHours(e.firstTime, e.lastTime),
                      color: isRobin ? 'var(--accent2)' : 'var(--accent)',
                    };
                    return (
                      <div
                        key={ei}
                        className={`pill ${isRobin ? 'pill-robin' : 'pill-device'}`}
                        onMouseEnter={ev => onHover(ev, [ttEntry])}
                        onMouseMove={onMove}
                        onMouseLeave={onLeave}
                      >
                        <span className="truncate">{isRobin ? 'Robin' : e.deviceDesc}</span>
                        <span className="shrink-0 opacity-70">·</span>
                        <span className="shrink-0">{hoursRounded(e.firstTime, e.lastTime)}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── MONTH GRID ──

function MonthGrid({ offset, entries, onHover, onMove, onLeave }: {
  offset: number;
  entries: PresenceEntry[];
  onHover: (ev: React.MouseEvent, entries: TooltipData['entries']) => void;
  onMove: (ev: React.MouseEvent) => void;
  onLeave: () => void;
}) {
  const { year, month } = monthRangeForOffset(offset);
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const MAX_DOTS = 4;

  return (
    <div className="card overflow-hidden" style={{ minWidth: 560 }}>
      {/* Header */}
      <div className="grid grid-cols-7 border-b" style={{ borderColor: 'var(--border)' }}>
        {weekdays.map((d, i) => (
          <div
            key={d}
            className="py-2 text-center font-mono text-[10px] font-medium tracking-widest uppercase"
            style={{
              borderRight: i < 6 ? '1px solid var(--border)' : undefined,
              color: 'var(--muted)',
              background: 'var(--surface)',
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before first day */}
        {Array.from({ length: startOffset }, (_, i) => (
          <div key={`empty-${i}`} style={{ minHeight: 80, borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', opacity: 0.4 }} />
        ))}

        {Array.from({ length: lastDay.getDate() }, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const dowRaw = date.getDay(), dow = dowRaw === 0 ? 6 : dowRaw - 1;
          const dayStr = toISODateStr(date);
          const dayEntries = entries.filter(e => (e.day || '').slice(0, 10) === dayStr);
          const isWknd = dow >= 5;
          const todayDay = isToday(date);
          const colIdx = (startOffset + i) % 7;

          const devicePeople = [...new Set(dayEntries.filter(e => e.type === 'device').map(e => e.userName))];
          const robinPeople  = [...new Set(dayEntries.filter(e => e.type === 'robin').map(e => e.userName))];
          const allPresent   = [...new Set(dayEntries.map(e => e.userName))];

          const tooltipEntries = allPresent.flatMap(name => {
            const personEntries = dayEntries.filter(e => e.userName === name);
            return personEntries.map(e => ({
              emoji: emoji(name),
              name,
              device: e.type === 'robin' ? 'Robin (desk)' : e.deviceDesc,
              from: e.firstTime,
              until: e.lastTime,
              duration: minsToHours(e.firstTime, e.lastTime),
              color: e.type === 'robin' ? 'var(--accent2)' : 'var(--accent)',
            }));
          });

          const dotsDevice = devicePeople.slice(0, MAX_DOTS);
          const dotsRobin  = robinPeople.slice(0, Math.max(0, MAX_DOTS - dotsDevice.length));
          const overflow   = Math.max(0, allPresent.length - MAX_DOTS);

          return (
            <div
              key={day}
              className="p-2 cursor-default transition-colors"
              style={{
                minHeight: 80,
                borderRight: colIdx < 6 ? '1px solid var(--border)' : undefined,
                borderBottom: '1px solid var(--border)',
                background: isWknd ? 'rgba(0,0,0,0.12)' : undefined,
                opacity: isWknd ? 0.65 : 1,
              }}
              onMouseEnter={tooltipEntries.length ? ev => onHover(ev, tooltipEntries) : undefined}
              onMouseMove={tooltipEntries.length ? onMove : undefined}
              onMouseLeave={tooltipEntries.length ? onLeave : undefined}
            >
              <div
                className="font-mono text-[11px] font-medium mb-1.5 w-6 h-6 flex items-center justify-center rounded-full"
                style={{
                  color: todayDay ? 'var(--bg)' : 'var(--muted)',
                  background: todayDay ? 'var(--accent)' : undefined,
                }}
              >
                {day}
              </div>
              <div className="flex flex-wrap gap-1">
                {dotsDevice.map(name => (
                  <div key={`d-${name}`} className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }} title={name} />
                ))}
                {dotsRobin.map(name => (
                  <div key={`r-${name}`} className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent2)' }} title={`${name} (Robin)`} />
                ))}
                {overflow > 0 && (
                  <span className="font-mono text-[9px]" style={{ color: 'var(--muted)' }}>+{overflow}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function ChevronLeft() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

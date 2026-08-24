import React, { useState, useEffect, useCallback } from 'react';
import { fetchPresence, emoji } from '../lib/db';
import type { PresenceEntry } from '../lib/types';
import { Tooltip, type TooltipEntry } from '../components/Tooltip';
import {
  getMondayOf, isToday, fmtShort, fmtWeekday, fmtMonthYear,
  minsToHours, signalStrength, weekRangeForOffset, monthRangeForOffset,
  toISODateStr,
} from '../lib/dateUtils';

type View = 'week' | 'month';

interface FilterState {
  people: Set<string>;
  devices: Set<string>;
}

export function CalendarPage() {
  const [view, setView]           = useState<View>('week');
  const [offset, setOffset]       = useState(0);
  const [entries, setEntries]     = useState<PresenceEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterState>({ people: new Set(), devices: new Set() });
  const [allPeople, setAllPeople] = useState<string[]>([]);
  const [allDevices, setAllDevices] = useState<string[]>([]);

  const [tooltip, setTooltip] = useState<{ entries: TooltipEntry[]; x: number; y: number; visible: boolean }>({
    entries: [], x: 0, y: 0, visible: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = view === 'week' ? weekRangeForOffset(offset) : monthRangeForOffset(offset);
      const rawData = await fetchPresence(range.start, range.end);
      const data = Array.isArray(rawData) ? rawData : [];
      setEntries(data);

      const people = new Set([...data.map(e => e.userName)].filter(Boolean));
      const devices = new Set([...data.filter(e => e.type === 'device').map(e => e.deviceDesc ?? '')].filter(Boolean));

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
      if (people.has(name)) people.delete(name);
      else people.add(name);
      return { ...prev, people };
    });
  }

  function toggleDevice(desc: string) {
    setFilter(prev => {
      const devices = new Set(prev.devices);
      if (devices.has(desc)) devices.delete(desc);
      else devices.add(desc);

      const people = new Set(prev.people);
      for (const person of allPeople) {
        const personDevices = allDevices.filter(d =>
          entries.some(e => e.userName === person && e.deviceDesc === d)
        );
        const allOff = personDevices.length > 0 && personDevices.every(d => !devices.has(d));
        if (allOff) people.delete(person);
        else if (personDevices.some(d => devices.has(d))) people.add(person);
      }
      return { people, devices };
    });
  }

  function showTooltip(ev: React.MouseEvent, tooltipEntries: TooltipEntry[]) {
    setTooltip({ entries: tooltipEntries, x: ev.clientX, y: ev.clientY, visible: true });
  }
  function hideTooltip() { setTooltip(t => ({ ...t, visible: false })); }

  const filteredEntries = entries.filter(e =>
    filter.people.has(e.userName) &&
    (e.type === 'robin' || filter.devices.has(e.deviceDesc ?? ''))
  );

  const uniquePeopleInView = [...new Set(filteredEntries.map(e => e.userName))].sort();

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* Top bar */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex items-center gap-2.5 h-11">
          <span className="font-mono text-[11px] font-medium text-muted tracking-[0.08em] uppercase mr-2">Calendar</span>
          <div className="flex items-center gap-1.5">
            <button className="btn btn-sm" onClick={() => setOffset(o => o - 1)}>←</button>
            <span className="period-label">
              {view === 'week'
                ? (() => { const m = getMondayOf(offset); const days = Array.from({length:7},(_,i)=>{const d=new Date(m);d.setDate(m.getDate()+i);return d;}); return `${fmtShort(days[0])} – ${fmtShort(days[6])}`; })()
                : fmtMonthYear(getMondayOf(offset))
              }
            </span>
            <button className="btn btn-sm" onClick={() => setOffset(o => o + 1)}>→</button>
            <button className="btn btn-sm" onClick={() => setOffset(0)}>Today</button>
            <div className="divider-v" />
            <button className={`btn btn-sm ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>Week</button>
            <button className={`btn btn-sm ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>Month</button>
          </div>
        </div>
      </div>

      {/* Filter strip */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex flex-wrap gap-1 items-center min-h-[36px]">
          <span className="font-mono text-[9px] text-muted font-medium tracking-[0.08em] uppercase shrink-0">People</span>
          {allPeople.map(name => (
            <button
              key={name}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] cursor-pointer border font-mono tracking-[0.01em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${filter.people.has(name) ? 'bg-accent/12 border-accent/40 text-accent' : 'border-border bg-transparent text-muted hover:border-muted hover:text-text'}`}
              onClick={() => togglePerson(name)}
            >
              {emoji(name)} {name}
            </button>
          ))}
          <div className="w-px h-3 bg-border mx-1 shrink-0" />
          <span className="font-mono text-[9px] text-muted font-medium tracking-[0.08em] uppercase shrink-0">Devices</span>
          {allDevices.map(d => (
            <button
              key={d}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] cursor-pointer border font-mono tracking-[0.01em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${filter.devices.has(d) ? 'bg-accent/12 border-accent/40 text-accent' : 'border-border bg-transparent text-muted hover:border-muted hover:text-text'}`}
              onClick={() => toggleDevice(d)}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex gap-4 items-center h-7">
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted tracking-[0.04em]">
            <div className="w-2 h-2 rounded-[1px] shrink-0" style={{background:'var(--accent)'}} />Device online
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted tracking-[0.04em]">
            <div className="w-2 h-2 rounded-[1px] shrink-0" style={{background:'var(--accent2)'}} />Robin reservation
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[9px] text-muted tracking-[0.04em]">
            <span className="online-dot" style={{marginRight:4}} />Online now
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="max-w-[1100px] mx-auto mt-16 px-8 text-center text-muted font-mono text-[11px]">Loading…</div>
        ) : (
          <div className="max-w-[1100px] mx-auto px-8">
            {view === 'week' ? (
              <WeekGrid
                offset={offset}
                entries={filteredEntries}
                visiblePeople={uniquePeopleInView}
                onHover={showTooltip}
                onLeave={hideTooltip}
              />
            ) : (
              <MonthGrid
                offset={offset}
                entries={filteredEntries}
                onHover={showTooltip}
                onLeave={hideTooltip}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex items-center gap-4 h-8 font-mono text-[9px] text-muted tracking-[0.04em]">
          <span>{uniquePeopleInView.length} {uniquePeopleInView.length === 1 ? 'person' : 'people'} visible</span>
          <span style={{marginLeft:'auto'}}>checks every 15 min</span>
        </div>
      </div>

      <Tooltip {...tooltip} />
    </div>
  );
}

// ── WEEK GRID ──

function SignalBars({ strength }: { strength: number }) {
  return (
    <span className="signal-bars">
      {[4, 6, 9, 12].map((h, i) => (
        <span key={i} className={`bar ${i < strength ? 'lit' : ''}`} style={{ height: h }} />
      ))}
    </span>
  );
}

function WeekGrid({ offset, entries, visiblePeople, onHover, onLeave }: {
  offset: number;
  entries: PresenceEntry[];
  visiblePeople: string[];
  onHover: (ev: React.MouseEvent, entries: TooltipEntry[]) => void;
  onLeave: () => void;
}) {
  const monday = getMondayOf(offset);
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  return (
    <div className="grid border-l border-t border-border min-w-[600px]" style={{gridTemplateColumns:'148px repeat(7,1fr)'}}>
      <div className="sticky top-0 bg-surface z-[3] border-r border-b border-border" />
      {days.map((d, i) => (
        <div key={i} className={`px-1.5 pt-1.5 pb-1 text-center font-mono text-[9px] font-medium tracking-[0.10em] uppercase border-r border-b border-border sticky top-0 bg-surface z-[2] ${isToday(d) ? 'text-accent' : 'text-muted'}`}>
          {fmtWeekday(d)}
          <span className={`block text-[14px] font-medium font-mono mt-0.5 tracking-[-0.01em] ${isToday(d) ? 'text-accent' : 'text-text'}`}>{d.getDate()}</span>
        </div>
      ))}

      {visiblePeople.map(personName => {
        const personEntries = entries.filter(e => e.userName === personName);
        return (
          <React.Fragment key={personName}>
            <div className="px-2.5 py-2 border-r border-b border-border flex flex-col justify-center gap-0.5 bg-surface sticky left-0 z-[1]">
              <span className="font-medium text-[12px] text-text">{emoji(personName)} {personName}</span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {[...new Set(personEntries.filter(e => e.type === 'device').map(e => e.deviceDesc))].map(d => (
                  <span key={d} className="font-mono text-[9px] text-muted bg-surface2 border border-border rounded-[1px] px-1 tracking-[0.01em]">{d}</span>
                ))}
              </div>
            </div>
            {days.map((d, di) => {
              const dayStr = toISODateStr(d);
              const dayEntries = personEntries.filter(e => (e.day || '').slice(0, 10) === dayStr);
              const todayCls = isToday(d) ? 'bg-accent/[0.03]' : '';
              const weekendCls = di >= 5 ? 'bg-surface2/40' : '';
              return (
                <div
                  key={`cell-${personName}-${di}`}
                  className={`border-r border-b border-border p-1 min-h-[60px] flex flex-col gap-0.5 ${todayCls} ${weekendCls}`}
                >
                  {dayEntries.map((e, ei) => {
                    const isRobin = e.type === 'robin';
                    const s = isRobin ? 3 : signalStrength(e.firstTime, e.lastTime);
                    const ttEntry: TooltipEntry = {
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
                        className={`rounded-[1px] px-1.5 py-1 text-[9px] cursor-default transition-[filter] flex items-center justify-between gap-0.5 hover:brightness-125 border-l-2 ${isRobin ? 'bg-accent2/11 border-accent2 text-accent2' : 'bg-accent/12 border-accent text-accent'}`}
                        onMouseMove={ev => onHover(ev, [ttEntry])}
                        onMouseLeave={onLeave}
                      >
                        <span className="font-mono font-medium text-[9px] whitespace-nowrap overflow-hidden text-ellipsis tracking-[0.01em]">{isRobin ? 'Robin' : e.deviceDesc}</span>
                        <SignalBars strength={s} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── MONTH GRID ──

function MonthGrid({ offset, entries, onHover, onLeave }: {
  offset: number;
  entries: PresenceEntry[];
  onHover: (ev: React.MouseEvent, entries: TooltipEntry[]) => void;
  onLeave: () => void;
}) {
  const { year, month } = monthRangeForOffset(offset);
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="grid grid-cols-7 border-l border-t border-border min-w-[560px]">
      {weekdays.map(d => (
        <div key={d} className="text-center font-mono text-[9px] font-medium tracking-[0.10em] uppercase text-muted py-1.5 border-r border-b border-border">{d}</div>
      ))}
      {Array.from({length: startOffset}, (_, i) => (
        <div key={`empty-${i}`} className="border-r border-b border-border min-h-[70px] bg-surface2/20" />
      ))}
      {Array.from({length: lastDay.getDate()}, (_, i) => {
        const day = i + 1;
        const date = new Date(year, month, day);
        const dowRaw = date.getDay(), dow = dowRaw === 0 ? 6 : dowRaw - 1;
        const dayStr = toISODateStr(date);
        const dayEntries = entries.filter(e => (e.day || '').slice(0, 10) === dayStr);
        const isWknd = dow >= 5;
        const todayDay = isToday(date);

        const byPerson = new Map<string, TooltipEntry[]>();
        for (const e of dayEntries) {
          const existing = byPerson.get(e.userName) ?? [];
          existing.push({
            emoji: emoji(e.userName),
            name: e.userName,
            device: e.type === 'robin' ? 'Robin (desk)' : e.deviceDesc,
            from: e.firstTime,
            until: e.lastTime,
            color: e.type === 'robin' ? 'var(--accent2)' : 'var(--accent)',
          });
          byPerson.set(e.userName, existing);
        }
        const tooltipEntries = [...byPerson.entries()].flatMap(([, v]) => v);

        const devicePeople = [...new Set(dayEntries.filter(e => e.type === 'device').map(e => e.userName))];
        const robinPeople  = [...new Set(dayEntries.filter(e => e.type === 'robin').map(e => e.userName))];

        return (
          <div
            key={day}
            className={`border-r border-b border-border p-1.5 min-h-[70px] cursor-default transition-colors hover:bg-surface2 ${todayDay ? 'bg-accent/[0.04]' : ''} ${isWknd ? 'bg-surface2/50 opacity-70' : ''}`}
            onMouseMove={tooltipEntries.length ? ev => onHover(ev, tooltipEntries) : undefined}
            onMouseLeave={tooltipEntries.length ? onLeave : undefined}
          >
            <div className={`font-mono text-[10px] mb-1 tracking-[0.02em] ${todayDay ? 'text-accent font-medium' : 'text-muted'}`}>{day}</div>
            <div className="flex flex-wrap gap-0.5">
              {devicePeople.map(name => (
                <div key={`d-${name}`} className="w-[7px] h-[7px] rounded-[1px]" style={{background:'var(--accent)'}} title={name} />
              ))}
              {robinPeople.map(name => (
                <div key={`r-${name}`} className="w-[7px] h-[7px] rounded-[1px]" style={{background:'var(--accent2)'}} title={`${name} (Robin)`} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

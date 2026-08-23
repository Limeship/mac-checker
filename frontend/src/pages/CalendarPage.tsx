import { useState, useEffect, useCallback } from 'react';
import { fetchPresence } from '../lib/db';
import type { PresenceEntry } from '../lib/types';
import { Tooltip, type TooltipEntry } from '../components/Tooltip';
import {
  getMondayOf, isToday, fmtShort, fmtWeekday, fmtMonthYear,
  minsToHours, signalStrength, weekRangeForOffset, monthRangeForOffset,
  toISODateStr,
} from '../lib/dateUtils';
import styles from './CalendarPage.module.css';

// Hardcoded emoji per person name
const EMOJI_MAP: Record<string, string> = {};
function emoji(name: string) { return EMOJI_MAP[name] ?? '👤'; }

type View = 'week' | 'month';

interface FilterState {
  people: Set<string>;   // active person names
  devices: Set<string>;  // active device descriptions
}

export function CalendarPage() {
  const [view, setView]           = useState<View>('week');
  const [offset, setOffset]       = useState(0);
  const [entries, setEntries]     = useState<PresenceEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterState>({ people: new Set(), devices: new Set() });
  const [allPeople, setAllPeople] = useState<string[]>([]);
  const [allDevices, setAllDevices] = useState<string[]>([]);

  // Tooltip state
  const [tooltip, setTooltip] = useState<{ entries: TooltipEntry[]; x: number; y: number; visible: boolean }>({
    entries: [], x: 0, y: 0, visible: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const range = view === 'week' ? weekRangeForOffset(offset) : monthRangeForOffset(offset);
      const data = await fetchPresence(range.start, range.end);
      setEntries(data);

      // build filter sets from data the first time
      setFilter(prev => {
        const people = new Set([...data.map(e => e.userName)]);
        const devices = new Set([...data.filter(e => e.type === 'device').map(e => e.deviceDesc ?? '')].filter(Boolean));
        // if filter is empty (first load), activate all
        if (prev.people.size === 0) return { people, devices };
        return prev;
      });
      setAllPeople([...new Set(data.map(e => e.userName))].sort());
      setAllDevices([...new Set(data.filter(e => e.type === 'device').map(e => e.deviceDesc ?? ''))].filter(Boolean).sort());
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

      // auto-deactivate person if all their devices are off
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
    <div className={styles.page}>
      {/* Top bar */}
      <div className={styles.topBar}>
        <span className={styles.pageTitle}>Calendar</span>

        <div className={styles.navControls}>
          <button className="btn btn-sm" onClick={() => setOffset(o => o - 1)}>←</button>
          <span className={`${styles.periodLabel} mono`}>
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

      {/* Filter strip */}
      <div className={styles.filterStrip}>
        <span className={styles.filterLabel}>People</span>
        {allPeople.map(name => (
          <button
            key={name}
            className={`${styles.filterBadge} ${filter.people.has(name) ? styles.filterBadgeOn : ''}`}
            onClick={() => togglePerson(name)}
          >
            {emoji(name)} {name}
          </button>
        ))}
        <div className={styles.filterSep} />
        <span className={styles.filterLabel}>Devices</span>
        {allDevices.map(d => (
          <button
            key={d}
            className={`${styles.filterBadge} ${filter.devices.has(d) ? styles.filterBadgeOn : ''}`}
            onClick={() => toggleDevice(d)}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'var(--accent)'}} />Device online</div>
        <div className={styles.legendItem}><div className={styles.legendDot} style={{background:'var(--accent2)'}} />Robin reservation</div>
        <div className={styles.legendItem}><span className="online-dot" style={{marginRight:4}} />Online now</div>
      </div>

      {/* Content */}
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : view === 'week' ? (
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

      {/* Footer */}
      <div className={styles.footer}>
        <span className="mono muted">
          {uniquePeopleInView.length} {uniquePeopleInView.length === 1 ? 'person' : 'people'} visible
        </span>
        <span className="mono muted" style={{marginLeft:'auto'}}>checks every 15 min</span>
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
    <div className={styles.weekGrid}>
      {/* Corner */}
      <div className={styles.corner} />
      {/* Day headers */}
      {days.map((d, i) => (
        <div key={i} className={`${styles.dayHeader} ${isToday(d) ? styles.today : ''}`}>
          {fmtWeekday(d)}
          <span className={styles.dateNum}>{d.getDate()}</span>
        </div>
      ))}

      {/* Person rows */}
      {visiblePeople.map(personName => {
        const personEntries = entries.filter(e => e.userName === personName);
        return (
          <>
            <div key={`label-${personName}`} className={styles.personLabel}>
              <span className={styles.personName}>{emoji(personName)} {personName}</span>
              <div className={styles.personDevices}>
                {[...new Set(personEntries.filter(e => e.type === 'device').map(e => e.deviceDesc))].map(d => (
                  <span key={d} className={styles.deviceChip}>{d}</span>
                ))}
              </div>
            </div>
            {days.map((d, di) => {
              const dayStr = toISODateStr(d);
              const dayEntries = personEntries.filter(e => (e.day || '').slice(0, 10) === dayStr);
              return (
                <div
                  key={`cell-${personName}-${di}`}
                  className={`${styles.dayCell} ${isToday(d) ? styles.todayCol : ''} ${di >= 5 ? styles.weekend : ''}`}
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
                        className={`${styles.block} ${isRobin ? styles.blockRobin : styles.blockDevice}`}
                        onMouseMove={ev => onHover(ev, [ttEntry])}
                        onMouseLeave={onLeave}
                      >
                        <span className={styles.blockLabel}>{isRobin ? 'Robin' : e.deviceDesc}</span>
                        <SignalBars strength={s} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
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
    <div className={styles.monthWrap}>
      <div className={styles.monthGrid}>
        {weekdays.map(d => (
          <div key={d} className={styles.monthDayHeader}>{d}</div>
        ))}
        {Array.from({length: startOffset}, (_, i) => (
          <div key={`empty-${i}`} className={styles.monthCellEmpty} />
        ))}
        {Array.from({length: lastDay.getDate()}, (_, i) => {
          const day = i + 1;
          const date = new Date(year, month, day);
          const dowRaw = date.getDay(), dow = dowRaw === 0 ? 6 : dowRaw - 1;
          const dayStr = toISODateStr(date);
          const dayEntries = entries.filter(e => (e.day || '').slice(0, 10) === dayStr);
          const isWknd = dow >= 5;

          // build tooltip entries grouped by person
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

          // dots: one per person per type
          const devicePeople = [...new Set(dayEntries.filter(e => e.type === 'device').map(e => e.userName))];
          const robinPeople  = [...new Set(dayEntries.filter(e => e.type === 'robin').map(e => e.userName))];

          return (
            <div
              key={day}
              className={`${styles.monthCell} ${isToday(date) ? styles.monthToday : ''} ${isWknd ? styles.monthWeekend : ''}`}
              onMouseMove={tooltipEntries.length ? ev => onHover(ev, tooltipEntries) : undefined}
              onMouseLeave={tooltipEntries.length ? onLeave : undefined}
            >
              <div className={styles.monthDate}>{day}</div>
              <div className={styles.presenceDots}>
                {devicePeople.map(name => (
                  <div key={`d-${name}`} className={styles.pdot} style={{background:'var(--accent)'}} title={name} />
                ))}
                {robinPeople.map(name => (
                  <div key={`r-${name}`} className={styles.pdot} style={{background:'var(--accent2)'}} title={`${name} (Robin)`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

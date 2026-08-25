import { useState, useEffect } from 'react';
import { fetchPeopleWithDevices } from '../lib/db';
import type { PersonWithDevices } from '../lib/types';

function fmtLastSeen(iso?: string): string {
  if (!iso) return 'never';
  const d = new Date(iso), now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days}d ago`;
}

export function DevicesPage() {
  const [people, setPeople] = useState<PersonWithDevices[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeopleWithDevices().then(p => { setPeople(p); setLoading(false); });
  }, []);

  const onlineCount = (p: PersonWithDevices) => p.devices.filter(d => d.online).length;

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="flex-1 overflow-auto">
        <div className="container py-6">
          {loading ? (
            <div className="py-16 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
              {people.map(person => (
                <div key={person.id} className="card overflow-hidden flex flex-col">
                  {/* Person header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                    <span className="text-xl leading-none">{person.emoji}</span>
                    <span className="font-semibold text-[14px]" style={{ color: 'var(--text)' }}>{person.name}</span>
                    {onlineCount(person) > 0 && (
                      <span
                        className="ml-auto flex items-center gap-1.5 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: 'rgba(63,185,80,0.12)', color: 'var(--online)', border: '1px solid rgba(63,185,80,0.25)' }}
                      >
                        <span className="online-dot" style={{ width: 6, height: 6 }} />
                        {onlineCount(person)} online
                      </span>
                    )}
                  </div>

                  {/* Device rows */}
                  {person.devices.length === 0 ? (
                    <div className="px-4 py-4 font-mono text-[12px]" style={{ color: 'var(--muted)' }}>No devices</div>
                  ) : (
                    <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
                      {person.devices.map(device => (
                        <div
                          key={device.id}
                          className="flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                          style={{
                            background: 'var(--surface)',
                            borderLeft: device.online ? '3px solid var(--online)' : '3px solid transparent',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>{device.description}</span>
                            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>{device.mac}</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5 shrink-0">
                            {device.online ? (
                              <span
                                className="flex items-center gap-1.5 font-mono text-[10px] font-medium px-2 py-0.5 rounded-full uppercase tracking-wider"
                                style={{ background: 'rgba(63,185,80,0.12)', color: 'var(--online)', border: '1px solid rgba(63,185,80,0.25)' }}
                              >
                                <span className="online-dot" style={{ width: 5, height: 5 }} />
                                online
                              </span>
                            ) : (
                              <span
                                className="font-mono text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                                style={{ background: 'var(--muted2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
                              >
                                offline
                              </span>
                            )}
                            <span className="font-mono text-[10px]" style={{ color: 'var(--muted)' }}>
                              {device.online ? 'active now' : fmtLastSeen(device.lastSeen)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

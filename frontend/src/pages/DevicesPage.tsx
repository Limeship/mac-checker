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
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
          {loading ? (
            <div className="py-16 text-center font-mono text-sm" style={{ color: 'var(--muted)' }}>Loading…</div>
          ) : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
              {people.map(person => {
                const online = onlineCount(person);
                return (
                  <div key={person.id} className="card overflow-hidden flex flex-col">
                    {/* Person header */}
                    <div
                      className="flex items-center"
                      style={{
                        gap: 12,
                        padding: '16px 20px',
                        borderBottom: '1px solid var(--border)',
                        background: 'var(--surface2)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center shrink-0 text-xl leading-none"
                        style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--muted2)' }}
                      >
                        {person.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[15px]" style={{ color: 'var(--text)' }}>{person.name}</div>
                        <div className="font-mono text-[11px]" style={{ color: 'var(--muted)', marginTop: 2 }}>
                          {person.devices.length} device{person.devices.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                      {online > 0 && (
                        <span
                          className="flex items-center font-mono text-[10px] font-medium uppercase tracking-wider shrink-0"
                          style={{ gap: 6, padding: '4px 10px', borderRadius: 999, background: 'rgba(63,185,80,0.12)', color: 'var(--online)', border: '1px solid rgba(63,185,80,0.25)' }}
                        >
                          <span className="online-dot" style={{ width: 6, height: 6 }} />
                          {online} online
                        </span>
                      )}
                    </div>

                    {/* Device rows */}
                    {person.devices.length === 0 ? (
                      <div className="font-mono text-[12px]" style={{ padding: '16px 20px', color: 'var(--muted)' }}>No devices</div>
                    ) : (
                      <div className="flex flex-col">
                        {person.devices.map((device, i) => (
                          <div
                            key={device.id}
                            className="flex items-center transition-colors"
                            style={{
                              gap: 12,
                              padding: '12px 20px',
                              borderTop: i > 0 ? '1px solid var(--border)' : undefined,
                              borderLeft: device.online ? '3px solid var(--online)' : '3px solid transparent',
                              background: 'var(--surface)',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                          >
                            {/* Device icon */}
                            <div
                              className="flex items-center justify-center shrink-0"
                              style={{
                                width: 32, height: 32, borderRadius: 8,
                                background: device.online ? 'rgba(63,185,80,0.10)' : 'var(--muted2)',
                              }}
                            >
                              <DeviceTypeIcon desc={device.description} online={device.online} />
                            </div>

                            {/* Name + MAC */}
                            <div className="flex-1 min-w-0">
                              <div className="text-[13px] font-medium truncate" style={{ color: 'var(--text)' }}>
                                {device.description}
                              </div>
                              <div className="font-mono text-[10px]" style={{ color: 'var(--muted)', marginTop: 2 }}>
                                {device.mac}
                              </div>
                            </div>

                            {/* Status + last seen */}
                            <div className="flex flex-col items-end shrink-0" style={{ gap: 4 }}>
                              {device.online ? (
                                <span
                                  className="flex items-center font-mono text-[10px] font-medium uppercase tracking-wider"
                                  style={{ gap: 5, padding: '3px 8px', borderRadius: 999, background: 'rgba(63,185,80,0.12)', color: 'var(--online)', border: '1px solid rgba(63,185,80,0.25)' }}
                                >
                                  <span className="online-dot" style={{ width: 5, height: 5 }} />
                                  online
                                </span>
                              ) : (
                                <span
                                  className="font-mono text-[10px] uppercase tracking-wider"
                                  style={{ padding: '3px 8px', borderRadius: 999, background: 'var(--muted2)', color: 'var(--muted)', border: '1px solid var(--border)' }}
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
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeviceTypeIcon({ desc, online }: { desc: string; online: boolean }) {
  const lower = desc.toLowerCase();
  const color = online ? 'var(--online)' : 'var(--muted)';
  if (lower.includes('iphone') || lower.includes('handy') || lower.includes('phone') || lower.includes('pixel')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
      </svg>
    );
  }
  if (lower.includes('lenovo') || lower.includes('wlan') || lower.includes('laptop')) {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="20" height="14" rx="2"/><path d="M2 20h20"/>
      </svg>
    );
  }
  // default: desktop/mac
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
    </svg>
  );
}

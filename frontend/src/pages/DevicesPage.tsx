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
  return `${days} days ago`;
}

export function DevicesPage() {
  const [people, setPeople] = useState<PersonWithDevices[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPeopleWithDevices().then(p => { setPeople(p); setLoading(false); });
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      <div className="border-b border-border bg-surface shrink-0">
        <div className="max-w-[1100px] mx-auto px-8 flex items-center h-11">
          <span className="font-mono text-[11px] font-medium text-muted tracking-[0.08em] uppercase">People & Devices</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1100px] mx-auto px-8 py-6">
          {loading ? (
            <div className="py-16 text-center text-muted font-mono text-[11px]">Loading…</div>
          ) : (
            <div className="border border-border rounded-[2px] overflow-hidden">
              {people.map(person => (
                <div key={person.id} className="bg-surface [&+&]:border-t [&+&]:border-border">
                  <div className="px-3.5 py-2.5 flex items-center gap-2 bg-surface2 border-b border-border">
                    <span className="text-base leading-none">{person.emoji}</span>
                    <span className="font-semibold text-[12px] text-text">{person.name}</span>
                  </div>
                  {person.devices.length === 0 ? (
                    <div className="px-3.5 py-2.5 font-mono text-[10px] text-muted">no devices</div>
                  ) : person.devices.map(device => (
                    <div key={device.id} className="flex items-center justify-between px-3.5 py-2 gap-2.5 border-t border-border border-l-2 border-l-transparent transition-colors hover:border-l-accent hover:bg-accent/[0.03]">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[12px] font-medium text-text whitespace-nowrap overflow-hidden text-ellipsis">{device.description}</span>
                        <span className="font-mono text-[9px] text-muted tracking-[0.03em]">{device.mac}</span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {device.online ? (
                          <span className="font-mono text-[9px] font-medium px-1.5 py-px rounded-[1px] bg-online/10 text-online border border-online/[0.28] flex items-center gap-1 tracking-[0.06em] uppercase">
                            <span className="online-dot" style={{width:5,height:5}} />
                            online
                          </span>
                        ) : (
                          <span className="font-mono text-[9px] px-1.5 py-px rounded-[1px] bg-transparent text-muted border border-border tracking-[0.06em] uppercase">offline</span>
                        )}
                        <span className="font-mono text-[9px] text-muted">
                          {device.online ? 'active now' : fmtLastSeen(device.lastSeen)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';

export interface TooltipEntry {
  emoji?: string;
  name: string;
  device?: string;
  from?: string;
  until?: string;
  duration?: string;
  color?: string;
}

interface Props {
  entries: TooltipEntry[];
  x: number;
  y: number;
  visible: boolean;
}

export function Tooltip({ entries, x, y, visible }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const left = Math.min(x + 14, window.innerWidth - el.offsetWidth - 8);
    const top  = Math.min(y - 10, window.innerHeight - el.offsetHeight - 8);
    setPos({ left, top });
  }, [x, y]);

  return (
    <div
      ref={ref}
      className={`fixed bg-surface2 border border-border rounded-[2px] px-3 py-2.5 text-[11px] pointer-events-none transition-opacity z-[200] min-w-[180px] max-w-[250px] ${visible ? 'opacity-100' : 'opacity-0'}`}
      style={{ left: pos.left, top: pos.top, boxShadow: 'var(--shadow)' }}
    >
      {entries.map((e, i) => (
        <div key={i}>
          {i > 0 && <div className="border-t border-border my-1.5" />}
          <div className="font-medium mb-1.5 text-[12px] text-text">{e.emoji} {e.name}</div>
          {e.device && (
            <div className="flex justify-between gap-3 mt-0.5 font-mono text-[10px] tracking-[0.02em]">
              <span style={{ color: e.color ?? 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {e.device}
              </span>
            </div>
          )}
          {(e.from || e.until) && (
            <>
              <div className="border-t border-border my-1 opacity-40" />
              {e.from     && <div className="flex justify-between gap-3 mt-0.5 text-muted font-mono text-[10px] tracking-[0.02em]"><span>From</span><span className="text-text font-mono text-[10px]">{e.from}</span></div>}
              {e.until    && <div className="flex justify-between gap-3 mt-0.5 text-muted font-mono text-[10px] tracking-[0.02em]"><span>Until</span><span className="text-text font-mono text-[10px]">{e.until}</span></div>}
              {e.duration && <div className="flex justify-between gap-3 mt-0.5 text-muted font-mono text-[10px] tracking-[0.02em]"><span>Duration</span><span className="text-text font-mono text-[10px]">{e.duration}</span></div>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

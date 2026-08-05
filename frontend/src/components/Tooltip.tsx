import { useEffect, useRef, useState } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipEntry {
  emoji?: string;
  name: string;
  device?: string;
  from?: string;
  until?: string;
  duration?: string;
  color?: string; // accent or accent2
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
      className={`${styles.tooltip} ${visible ? styles.visible : ''}`}
      style={{ left: pos.left, top: pos.top }}
    >
      {entries.map((e, i) => (
        <div key={i}>
          {i > 0 && <div className={styles.divider} />}
          <div className={styles.name}>{e.emoji} {e.name}</div>
          {e.device && (
            <div className={styles.row}>
              <span style={{ color: e.color ?? 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 10 }}>
                {e.device}
              </span>
            </div>
          )}
          {(e.from || e.until) && (
            <>
              <div className={styles.dividerSoft} />
              {e.from  && <div className={styles.row}><span>From</span><span>{e.from}</span></div>}
              {e.until && <div className={styles.row}><span>Until</span><span>{e.until}</span></div>}
              {e.duration && <div className={styles.row}><span>Duration</span><span>{e.duration}</span></div>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

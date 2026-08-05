import { useState, useEffect } from 'react';
import { fetchStats, type StatsResult } from '../lib/db';
import styles from './StatsPage.module.css';

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
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.pageTitle}>Statistics</span>
        <div className={styles.controls}>
          <button className={`btn btn-sm ${period === 'monthly' ? 'active' : ''}`} onClick={() => setPeriod('monthly')}>This month</button>
          <button className={`btn btn-sm ${period === 'yearly'  ? 'active' : ''}`} onClick={() => setPeriod('yearly')}>This year</button>
        </div>
      </div>

      <div className={styles.scrollArea}>
        {loading || !stats ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          <div className={styles.content}>

            {/* Row 1: Days + Hours leaderboards */}
            <div className={styles.row2}>
              <section>
                <h3 className={styles.sectionTitle}>Days in office</h3>
                <Leaderboard
                  rows={stats.daysInOffice.map(r => ({ name: r.userName, value: `${r.days} days`, pct: r.days / (stats.daysInOffice[0]?.days || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
              <section>
                <h3 className={styles.sectionTitle}>Hours online</h3>
                <Leaderboard
                  rows={stats.hoursOnline.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.hoursOnline[0]?.hours || 1) * 100 }))}
                  color="var(--accent2)"
                />
              </section>
            </div>

            {/* Row 2: Arrival/departure + avg hours */}
            <div className={styles.row3}>
              <section>
                <h3 className={styles.sectionTitle}>Earliest arrival (avg)</h3>
                <Leaderboard
                  rows={stats.earliestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                  color="var(--accent)"
                  mono
                />
              </section>
              <section>
                <h3 className={styles.sectionTitle}>Latest departure (avg)</h3>
                <Leaderboard
                  rows={stats.latestAvg.map((r, i) => ({ name: r.userName, value: r.time, pct: 100 - i * 15 }))}
                  color="var(--accent2)"
                  mono
                />
              </section>
              <section>
                <h3 className={styles.sectionTitle}>Avg hours / day present</h3>
                <Leaderboard
                  rows={stats.avgHoursPerDay.map(r => ({ name: r.userName, value: `${r.hours}h`, pct: r.hours / (stats.avgHoursPerDay[0]?.hours || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
            </div>

            {/* Row 3: Streaks + consistent day */}
            <div className={styles.row2}>
              <section>
                <h3 className={styles.sectionTitle}>Longest streak</h3>
                <Leaderboard
                  rows={stats.longestStreak.map(r => ({ name: r.userName, value: `${r.days} days`, pct: r.days / (stats.longestStreak[0]?.days || 1) * 100 }))}
                  color="var(--accent)"
                />
              </section>
              <section>
                <h3 className={styles.sectionTitle}>Most consistent day</h3>
                <div className={styles.listCards}>
                  {stats.mostConsistentDay.map(r => (
                    <div key={r.userId} className={styles.listCard}>
                      <span>{emoji(r.userName)} {r.userName}</span>
                      <span className={`${styles.tag} mono`}>{r.weekday}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Peak office day */}
            <section>
              <h3 className={styles.sectionTitle}>Peak office day</h3>
              <div className={styles.peakCard}>
                <span className={`${styles.peakDay} mono`}>{stats.peakOfficeDay.weekday}</span>
                <span className={styles.peakSub}>avg {stats.peakOfficeDay.avgPeople} people</span>
              </div>
            </section>

            {/* Device uptime */}
            <section>
              <h3 className={styles.sectionTitle}>Device uptime (% of working days)</h3>
              <div className={styles.leaderboard}>
                {stats.deviceUptime.map((r, i) => (
                  <div key={r.deviceId} className={styles.lbRow}>
                    <span className={`${styles.lbRank} ${rankClass(i)} mono`}>{i + 1}</span>
                    <div className={styles.lbMid}>
                      <div className={styles.lbName}>
                        <span className={styles.lbSub}>{emoji(r.userName)} {r.userName}</span>
                        <span className={`mono ${styles.lbDevice}`}>{r.deviceDesc}</span>
                      </div>
                      <div className={styles.lbBarWrap}>
                        <div className={styles.lbBar} style={{ width: `${r.pct}%`, background: 'var(--accent2)' }} />
                      </div>
                    </div>
                    <span className={`${styles.lbVal} mono`}>{r.pct}%</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Multi-device days */}
            {stats.multiDeviceDays.length > 0 && (
              <section>
                <h3 className={styles.sectionTitle}>Days with multiple devices</h3>
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

function rankClass(i: number) {
  if (i === 0) return styles.gold;
  if (i === 1) return styles.silver;
  if (i === 2) return styles.bronze;
  return '';
}

function Leaderboard({ rows, color, mono }: {
  rows: Array<{ name: string; value: string; pct: number }>;
  color: string;
  mono?: boolean;
}) {
  return (
    <div className={styles.leaderboard}>
      {rows.map((r, i) => (
        <div key={r.name} className={styles.lbRow}>
          <span className={`${styles.lbRank} ${rankClass(i)} mono`}>{i + 1}</span>
          <div className={styles.lbMid}>
            <div className={styles.lbName}>{emoji(r.name)} {r.name}</div>
            <div className={styles.lbBarWrap}>
              <div className={styles.lbBar} style={{ width: `${r.pct}%`, background: color }} />
            </div>
          </div>
          <span className={`${styles.lbVal} ${mono ? 'mono' : ''}`}>{r.value}</span>
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { fetchPeopleWithDevices } from '../lib/db';
import type { PersonWithDevices } from '../lib/types';
import styles from './DevicesPage.module.css';

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
    <div className={styles.page}>
      <div className={styles.topBar}>
        <span className={styles.pageTitle}>People & Devices</span>
      </div>
      <div className={styles.scrollArea}>
        {loading ? (
          <div className={styles.loading}>Loading…</div>
        ) : (
          <div className={styles.grid}>
            {people.map(person => (
              <div key={person.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={styles.personEmoji}>{person.emoji}</span>
                  <span className={styles.personName}>{person.name}</span>
                </div>
                {person.devices.length === 0 ? (
                  <div className={styles.noDevices}>No devices</div>
                ) : person.devices.map(device => (
                  <div key={device.id} className={styles.deviceRow}>
                    <div className={styles.deviceInfo}>
                      <span className={styles.deviceDesc}>{device.description}</span>
                      <span className={`${styles.deviceMac} mono`}>{device.mac}</span>
                    </div>
                    <div className={styles.deviceStatus}>
                      {device.online ? (
                        <span className={styles.onlineBadge}>
                          <span className="online-dot" style={{width:5,height:5}} />
                          online
                        </span>
                      ) : (
                        <span className={styles.offlineBadge}>offline</span>
                      )}
                      <span className={`${styles.lastSeen} mono`}>
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
  );
}

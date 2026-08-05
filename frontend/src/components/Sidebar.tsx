import { Logo } from './Logo';
import { themes, applyTheme, type ThemeId } from '../lib/themes';
import styles from './Sidebar.module.css';

type Page = 'calendar' | 'stats' | 'devices';

interface Props {
  currentPage: Page;
  currentTheme: ThemeId;
  onPageChange: (p: Page) => void;
  onThemeChange: (t: ThemeId) => void;
}

export function Sidebar({ currentPage, currentTheme, onPageChange, onThemeChange }: Props) {
  function handleTheme(id: ThemeId) {
    applyTheme(id);
    onThemeChange(id);
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}><Logo /></div>

      <NavBtn
        active={currentPage === 'calendar'}
        title="Calendar"
        onClick={() => onPageChange('calendar')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </NavBtn>

      <NavBtn
        active={currentPage === 'stats'}
        title="Statistics"
        onClick={() => onPageChange('stats')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/>
          <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor"/>
          <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor"/>
        </svg>
      </NavBtn>

      <NavBtn
        active={currentPage === 'devices'}
        title="People & Devices"
        onClick={() => onPageChange('devices')}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M11 7c1.1 0 2 .9 2 2M13 3c1.7.7 2.8 2.4 2.8 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </NavBtn>

      <div className={styles.spacer} />

      {/* Theme swatches */}
      <div className={styles.themeGroup}>
        {themes.map(t => (
          <button
            key={t.id}
            className={`${styles.swatch} ${currentTheme === t.id ? styles.swatchActive : ''}`}
            style={{ background: t.swatch }}
            title={t.label}
            onClick={() => handleTheme(t.id)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavBtn({ active, title, onClick, children }: {
  active: boolean; title: string; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      className={`${styles.navBtn} ${active ? styles.navBtnActive : ''}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

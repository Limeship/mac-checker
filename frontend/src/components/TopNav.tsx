import { Logo } from './Logo';
import { themes, applyTheme, type ThemeId } from '../lib/themes';

type Page = 'calendar' | 'stats' | 'devices';

interface Props {
  currentPage: Page;
  currentTheme: ThemeId;
  onPageChange: (p: Page) => void;
  onThemeChange: (t: ThemeId) => void;
}

export function TopNav({ currentPage, currentTheme, onPageChange, onThemeChange }: Props) {
  function handleTheme(id: ThemeId) {
    applyTheme(id);
    onThemeChange(id);
  }

  return (
    <header className="shrink-0 border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
      <div className="container flex items-center gap-2" style={{ height: 52 }}>
        <div className="mr-2 sm:mr-4 shrink-0"><Logo /></div>

        <nav className="flex items-center gap-0.5 sm:gap-1 flex-1 min-w-0">
          <NavLink active={currentPage === 'calendar'} onClick={() => onPageChange('calendar')}>
            <CalendarIcon />
            <span className="hidden sm:inline">Calendar</span>
          </NavLink>
          <NavLink active={currentPage === 'stats'} onClick={() => onPageChange('stats')}>
            <StatsIcon />
            <span className="hidden sm:inline">Stats</span>
          </NavLink>
          <NavLink active={currentPage === 'devices'} onClick={() => onPageChange('devices')}>
            <PeopleIcon />
            <span className="hidden sm:inline">People</span>
          </NavLink>
        </nav>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {themes.map(t => (
            <button
              key={t.id}
              title={t.label}
              onClick={() => handleTheme(t.id)}
              className="cursor-pointer p-0 bg-transparent border-0 focus-visible:outline focus-visible:outline-2 rounded-full"
              style={{ outline: currentTheme === t.id ? `2px solid var(--accent)` : undefined, outlineOffset: 2 }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'block', borderRadius: '50%' }}>
                <clipPath id={`clip-${t.id}`}><circle cx="9" cy="9" r="8" /></clipPath>
                <g clipPath={`url(#clip-${t.id})`}>
                  <rect x="0" y="0" width="9" height="18" fill={t.swatchBg} />
                  <rect x="9" y="0" width="9" height="18" fill={t.swatchAccent} />
                </g>
                <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function NavLink({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button className={`nav-link nav-link-mobile ${active ? 'active' : ''}`} onClick={onClick}>
      {children}
    </button>
  );
}

function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function StatsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/>
      <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor"/>
      <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor"/>
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M11 7c1.1 0 2 .9 2 2M13 3c1.7.7 2.8 2.4 2.8 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

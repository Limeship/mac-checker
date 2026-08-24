import { Logo } from './Logo';
import { themes, applyTheme, type ThemeId } from '../lib/themes';

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
    <nav className="w-14 bg-surface border-r border-border flex flex-col items-center py-4 gap-0.5 shrink-0">
      <div className="mb-5"><Logo /></div>

      <NavBtn active={currentPage === 'calendar'} title="Calendar" onClick={() => onPageChange('calendar')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M5 1v3M11 1v3M1 7h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </NavBtn>

      <NavBtn active={currentPage === 'stats'} title="Statistics" onClick={() => onPageChange('stats')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/>
          <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor"/>
          <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor"/>
        </svg>
      </NavBtn>

      <NavBtn active={currentPage === 'devices'} title="People & Devices" onClick={() => onPageChange('devices')}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 14c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M11 7c1.1 0 2 .9 2 2M13 3c1.7.7 2.8 2.4 2.8 4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </NavBtn>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-1.5 pb-1">
        {themes.map(t => (
          <button
            key={t.id}
            className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer transition-transform hover:scale-[1.18] flex items-center justify-center overflow-hidden p-0 bg-transparent focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${currentTheme === t.id ? 'border-text scale-[1.12]' : 'border-transparent'}`}
            title={t.label}
            onClick={() => handleTheme(t.id)}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" style={{ display: 'block' }}>
              <clipPath id={`clip-${t.id}`}>
                <circle cx="9" cy="9" r="8" />
              </clipPath>
              <g clipPath={`url(#clip-${t.id})`}>
                <rect x="0" y="0" width="9" height="18" fill={t.swatchBg} />
                <rect x="9" y="0" width="9" height="18" fill={t.swatchAccent} />
              </g>
              <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
            </svg>
          </button>
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
      className={`relative w-10 h-10 rounded-sm border-0 cursor-pointer flex items-center justify-center transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent ${active ? 'nav-btn-active' : 'bg-transparent text-muted hover:bg-surface2 hover:text-text'}`}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

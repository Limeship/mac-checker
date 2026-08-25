import { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { DevicesPage } from './pages/DevicesPage';
import { applyTheme, loadSavedTheme, type ThemeId } from './lib/themes';

type Page = 'calendar' | 'stats' | 'devices';

export function App() {
  const [page, setPage]   = useState<Page>('calendar');
  const [theme, setTheme] = useState<ThemeId>(() => loadSavedTheme());

  useEffect(() => { applyTheme(theme); }, []);

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>
      <TopNav
        currentPage={page}
        currentTheme={theme}
        onPageChange={setPage}
        onThemeChange={setTheme}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {page === 'calendar' && <CalendarPage />}
        {page === 'stats'    && <StatsPage />}
        {page === 'devices'  && <DevicesPage />}
      </main>
    </div>
  );
}

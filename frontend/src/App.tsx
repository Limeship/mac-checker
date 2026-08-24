import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
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
    <div className="flex flex-1 h-screen overflow-hidden">
      <Sidebar
        currentPage={page}
        currentTheme={theme}
        onPageChange={setPage}
        onThemeChange={setTheme}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {page === 'calendar' && <CalendarPage />}
        {page === 'stats'    && <StatsPage />}
        {page === 'devices'  && <DevicesPage />}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { DevicesPage } from './pages/DevicesPage';
import { applyTheme, loadSavedTheme, type ThemeId } from './lib/themes';
import styles from './App.module.css';

type Page = 'calendar' | 'stats' | 'devices';

export function App() {
  const [page, setPage]   = useState<Page>('calendar');
  const [theme, setTheme] = useState<ThemeId>(() => loadSavedTheme());

  useEffect(() => { applyTheme(theme); }, []);

  return (
    <div className={styles.layout}>
      <Sidebar
        currentPage={page}
        currentTheme={theme}
        onPageChange={setPage}
        onThemeChange={setTheme}
      />
      <div className={styles.main}>
        {page === 'calendar' && <CalendarPage />}
        {page === 'stats'    && <StatsPage />}
        {page === 'devices'  && <DevicesPage />}
      </div>
    </div>
  );
}

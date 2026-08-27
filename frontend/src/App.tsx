import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { TopNav } from './components/TopNav';
import { CalendarPage } from './pages/CalendarPage';
import { StatsPage } from './pages/StatsPage';
import { DevicesPage } from './pages/DevicesPage';
import { applyTheme, loadSavedTheme, type ThemeId } from './lib/themes';

type Page = 'calendar' | 'stats' | 'devices';

function AppInner() {
  const [theme, setTheme] = useState<ThemeId>(() => loadSavedTheme());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => { applyTheme(theme); }, []);

  const currentPage: Page =
    location.pathname.startsWith('/stats')   ? 'stats'   :
    location.pathname.startsWith('/devices') ? 'devices' : 'calendar';

  function handlePageChange(p: Page) {
    navigate(p === 'calendar' ? '/' : `/${p}`);
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh' }}>
      <TopNav
        currentPage={currentPage}
        currentTheme={theme}
        onPageChange={handlePageChange}
        onThemeChange={setTheme}
      />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <Routes>
          <Route path="/"        element={<CalendarPage />} />
          <Route path="/stats"   element={<StatsPage />} />
          <Route path="/devices" element={<DevicesPage />} />
          <Route path="*"        element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

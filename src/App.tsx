import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './components/Dashboard';
import { AppAnalyticsPage } from './pages/AppAnalyticsPage';
import { TimelinePage } from './pages/TimelinePage';
import { SettingsPage } from './pages/SettingsPage';
import { ScreenshotsPage } from './pages/ScreenshotsPage';
import { ThemeProvider } from "@/lib/theme-provider";
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<AppAnalyticsPage />} />
            <Route path="analytics/:appId" element={<AppAnalyticsPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="screenshots" element={<ScreenshotsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthGate } from './admin/AdminAuthGate';
import { AdminDashboardPage } from './admin/AdminDashboardPage';
import { PrayerOfficeMockup } from './components/PrayerOfficeMockup';
import { installPrayerAnalytics } from './lib/prayerAnalytics';
import { CalendarEngineAdminPage } from './pages/CalendarEngineAdminPage';

export default function App() {
  useEffect(() => installPrayerAnalytics(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/admin' element={<AdminAuthGate><AdminDashboardPage /></AdminAuthGate>} />
        <Route path='/admin/partners' element={<AdminAuthGate><AdminDashboardPage /></AdminAuthGate>} />
        <Route path='/admin/calendar-engine' element={<AdminAuthGate><CalendarEngineAdminPage /></AdminAuthGate>} />
        <Route path='/for-parishes' element={<Navigate to='/parishes' replace />} />
        <Route path='*' element={<PrayerOfficeMockup />} />
      </Routes>
    </BrowserRouter>
  );
}

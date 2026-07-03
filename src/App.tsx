import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrayerOfficeMockup } from './components/PrayerOfficeMockup';
import { installPrayerAnalytics } from './lib/prayerAnalytics';
import { CalendarEngineAdminPage } from './pages/CalendarEngineAdminPage';

export default function App() {
  useEffect(() => installPrayerAnalytics(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/admin/calendar-engine' element={<CalendarEngineAdminPage />} />
        <Route path='*' element={<PrayerOfficeMockup />} />
      </Routes>
    </BrowserRouter>
  );
}

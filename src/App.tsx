import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrayerOfficeMockup } from './components/PrayerOfficeMockup';
import { installPrayerAnalytics } from './lib/prayerAnalytics';

export default function App() {
  useEffect(() => installPrayerAnalytics(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path='*' element={<PrayerOfficeMockup />} />
      </Routes>
    </BrowserRouter>
  );
}

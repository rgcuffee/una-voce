import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AdminAuthGate } from './admin/AdminAuthGate';
import { PrayerOfficeMockup } from './components/PrayerOfficeMockup';
import { installPrayerAnalytics } from './lib/prayerAnalytics';
import { CalendarEngineAdminPage } from './pages/CalendarEngineAdminPage';
import { DevotionPage } from './pages/DevotionPage';

const AdminDashboardPage = lazy(() => import('./admin/AdminDashboardPage').then((module) => ({ default: module.AdminDashboardPage })));

function AdminPage() {
  return <AdminAuthGate><Suspense fallback={<main className="admin-login"><div className="engine-empty">Loading admin…</div></main>}><AdminDashboardPage /></Suspense></AdminAuthGate>;
}

export default function App() {
  useEffect(() => installPrayerAnalytics(), []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/admin' element={<AdminPage />} />
        <Route path='/admin/partners' element={<AdminPage />} />
        <Route path='/admin/partners/review' element={<AdminPage />} />
        <Route path='/admin/partners/sources' element={<AdminPage />} />
        <Route path='/admin/partners/rules' element={<AdminPage />} />
        <Route path='/admin/devotions' element={<AdminPage />} />
        <Route path='/admin/analytics/activity' element={<AdminPage />} />
        <Route path='/admin/analytics/communities' element={<AdminPage />} />
        <Route path='/admin/analytics/devotions' element={<AdminPage />} />
        <Route path='/admin/analytics' element={<Navigate to='/admin/analytics/activity' replace />} />
        <Route path='/admin/calendar-engine' element={<AdminAuthGate><CalendarEngineAdminPage /></AdminAuthGate>} />
        <Route path='/devotions/holy-spirit-mens-ministry/night-prayer' element={<DevotionPage />} />
        <Route path='*' element={<PrayerOfficeMockup />} />
      </Routes>
    </BrowserRouter>
  );
}

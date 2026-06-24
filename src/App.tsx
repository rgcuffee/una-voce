import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrayerOfficeMockup } from './components/PrayerOfficeMockup';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='*' element={<PrayerOfficeMockup />} />
      </Routes>
    </BrowserRouter>
  );
}

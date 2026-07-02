/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { APIProvider } from '@vis.gl/react-google-maps';
import { AuthProvider } from './components/AuthProvider';
import { LanguageProvider } from './components/LanguageProvider';
import Layout from './components/Layout';
import ActivitiesPage from './pages/ActivitiesPage';
import CommunityPage from './pages/CommunityPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';
import ServicesPage from './pages/ServicesPage';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

export default function App() {
  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <LanguageProvider>
        <AuthProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<ActivitiesPage />} />
                <Route path="/community" element={<CommunityPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/services" element={<ServicesPage />} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      </LanguageProvider>
    </APIProvider>
  );
}

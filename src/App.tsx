/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { LanguageProvider } from './components/LanguageProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { UserProfileModalProvider } from './components/UserProfileModal';
import Layout from './components/Layout';
import ActivitiesPage from './pages/ActivitiesPage';
import CommunityPage from './pages/CommunityPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';
import ServicesPage from './pages/ServicesPage';
import GuidePage from './pages/GuidePage';

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <UserProfileModalProvider>
            <Router>
              <Layout>
                <Routes>
                  <Route path="/" element={<ActivitiesPage />} />
                  <Route path="/community" element={<CommunityPage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/guide" element={<GuidePage />} />
                </Routes>
              </Layout>
            </Router>
          </UserProfileModalProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

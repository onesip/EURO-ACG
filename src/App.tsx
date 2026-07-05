/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './components/AuthProvider';
import { LanguageProvider } from './components/LanguageProvider';
import { ThemeProvider } from './components/ThemeProvider';
import { UserProfileModalProvider } from './components/UserProfileModal';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import GenderPopup from './components/GenderPopup';
import ActivitiesPage from './pages/ActivitiesPage';
import CommunityPage from './pages/CommunityPage';
import MarketPage from './pages/MarketPage';
import ProfilePage from './pages/ProfilePage';
import ServicesPage from './pages/ServicesPage';
import GuidePage from './pages/GuidePage';
import MembersPage from './pages/MembersPage';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Check if the splash was already played in the current session
    const isSplashShown = sessionStorage.getItem('euroacg_splash_shown');
    if (isSplashShown === 'true') {
      setShowSplash(false);
    }
  }, []);

  const handleSplashComplete = () => {
    sessionStorage.setItem('euroacg_splash_shown', 'true');
    setShowSplash(false);
  };

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <UserProfileModalProvider>
            {showSplash ? (
              <SplashScreen onComplete={handleSplashComplete} />
            ) : (
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<ActivitiesPage />} />
                    <Route path="/community" element={<CommunityPage />} />
                    <Route path="/market" element={<MarketPage />} />
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/services" element={<ServicesPage />} />
                    <Route path="/guide" element={<GuidePage />} />
                    <Route path="/members" element={<MembersPage />} />
                  </Routes>
                </Layout>
                <GenderPopup />
              </Router>
            )}
          </UserProfileModalProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

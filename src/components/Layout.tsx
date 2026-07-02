import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, ShoppingBag, User as UserIcon, LogIn, LogOut, Globe, Camera } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { loginWithGoogle, logout } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();

  const navItems = [
    { name: t('nav.activities'), path: '/', icon: Calendar },
    { name: t('nav.community'), path: '/community', icon: MessageSquare },
    { name: t('nav.market'), path: '/market', icon: ShoppingBag },
    { name: t('nav.services'), path: '/services', icon: Camera },
  ];

  const LanguageToggle = () => (
    <button 
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
    >
      <Globe className="w-4 h-4" />
      {lang === 'en' ? '中文' : 'English'}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-slate-200 font-sans pb-20 md:pb-0 md:pl-64">
      {/* Sidebar for Desktop */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-[#141416] border-r border-white/5 md:flex flex-col">
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">Euro<span className="text-indigo-400 font-light">ACG</span></h1>
            <LanguageToggle />
          </div>
          <p className="text-sm text-slate-400">European ACG Community</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                location.pathname === item.path 
                  ? "bg-indigo-500/10 text-indigo-400 font-medium" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
          {user && (
            <Link
              to="/profile"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors",
                location.pathname === '/profile' 
                  ? "bg-indigo-500/10 text-indigo-400 font-medium" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <UserIcon className="w-5 h-5" />
              {t('nav.profile')}
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          {user ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-0.5 overflow-hidden">
                  <div className="w-full h-full rounded-full bg-[#141416] flex items-center justify-center font-bold text-white overflow-hidden">
                    {profile?.photoURL ? <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : profile?.displayName?.charAt(0) || user.email?.charAt(0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{profile?.displayName || t('nav.setName')}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-2 w-full py-2 text-sm text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                <LogOut className="w-4 h-4" />
                {t('nav.logout')}
              </button>
            </div>
          ) : (
            <button 
              onClick={loginWithGoogle}
              className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              <LogIn className="w-5 h-5" />
              {t('nav.login')}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-4 md:p-8 pt-16 md:pt-8">
        {/* Mobile Header with Language Toggle */}
        <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-[#141416]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50">
           <h1 className="text-lg font-bold tracking-tight text-white">Euro<span className="text-indigo-400 font-light">ACG</span></h1>
           <LanguageToggle />
        </div>
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#141416] border-t border-white/5 flex items-center justify-around p-3 pb-safe z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              location.pathname === item.path 
                ? "text-indigo-400" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.name}</span>
          </Link>
        ))}
        {user ? (
          <Link
            to="/profile"
            className={cn(
              "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
              location.pathname === '/profile' 
                ? "text-indigo-400" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <UserIcon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{t('nav.profile')}</span>
          </Link>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-500"
          >
            <LogIn className="w-6 h-6" />
            <span className="text-[10px] font-medium">{t('nav.login')}</span>
          </button>
        )}
      </nav>
    </div>
  );
}

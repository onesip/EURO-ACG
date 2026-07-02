import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, MessageSquare, ShoppingBag, User as UserIcon, LogIn, LogOut, Globe, Camera, BookOpen, X, Sparkles, Palette, Mail, Lock, User, RefreshCw } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { loginWithGoogle, registerWithEmail, loginWithEmail, logout } from '../lib/firebase';
import { cn } from '../lib/utils';
import { useTheme, ACG_THEMES } from './ThemeProvider';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { activeTheme, setThemeById } = useTheme();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Email login/register states
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayNameState, setDisplayNameState] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    if (!email || !password) {
      setAuthError(lang === 'zh' ? '请填写所有必填字段' : 'Please fill in all fields');
      setAuthLoading(false);
      return;
    }
    
    try {
      if (emailMode === 'register') {
        if (!displayNameState) {
          setAuthError(lang === 'zh' ? '请填写昵称' : 'Please fill in a display name');
          setAuthLoading(false);
          return;
        }
        await registerWithEmail(email, password, displayNameState);
      } else {
        await loginWithEmail(email, password);
      }
      setIsLoginModalOpen(false);
      setEmail('');
      setPassword('');
      setDisplayNameState('');
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message;
      if (err.code === 'auth/email-already-in-use') {
        errMsg = lang === 'zh' ? '该邮箱已被注册' : 'Email already in use';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errMsg = lang === 'zh' ? '邮箱或密码错误' : 'Incorrect email or password';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = lang === 'zh' ? '无效的邮箱格式' : 'Invalid email format';
      } else if (err.code === 'auth/weak-password') {
        errMsg = lang === 'zh' ? '密码强度不足（至少6位）' : 'Password too weak (at least 6 chars)';
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const navItems = [
    { name: t('nav.activities'), path: '/', icon: Calendar },
    { name: t('nav.community'), path: '/community', icon: MessageSquare },
    { name: t('nav.market'), path: '/market', icon: ShoppingBag },
    { name: t('nav.services'), path: '/services', icon: Camera },
    { name: t('nav.guide'), path: '/guide', icon: BookOpen },
  ];

  const LanguageToggle = () => (
    <button 
      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 shrink-0"
    >
      <Globe className="w-3.5 h-3.5" />
      {lang === 'en' ? '中文' : 'EN'}
    </button>
  );

  const ThemeRow = () => (
    <div className="flex items-center gap-1.5">
      {ACG_THEMES.map((theme) => {
        const isActive = activeTheme.id === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => setThemeById(theme.id)}
            title={lang === 'zh' ? theme.name : theme.nameEn}
            className={cn(
              "w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 focus:outline-none relative flex items-center justify-center",
              isActive ? "scale-110 ring-1 ring-white/50 ring-offset-1 ring-offset-[#141416]" : ""
            )}
            style={{ backgroundColor: `rgb(${theme.colors.theme500})` }}
          >
            {isActive && <div className="w-1 h-1 rounded-full bg-white" />}
          </button>
        );
      })}
    </div>
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
          <p className="text-sm text-slate-400 mb-3">European ACG Community</p>
          <div className="flex items-center justify-between gap-1 border-t border-white/5 pt-3">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
              <Palette className="w-3.5 h-3.5" />
              {lang === 'zh' ? '主题皮肤' : 'Skins'}
            </span>
            <ThemeRow />
          </div>
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
              onClick={() => setIsLoginModalOpen(true)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
            >
              <LogIn className="w-5 h-5" />
              {t('nav.login')}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-6 pt-20 pb-28 md:px-8 md:py-8 md:pt-8 md:pb-8">
        {/* Mobile Header with Language Toggle */}
        <div className="md:hidden fixed top-0 inset-x-0 h-14 bg-[#141416]/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 z-50">
           <h1 className="text-lg font-bold tracking-tight text-white">EUROACG</h1>
           <div className="flex items-center gap-3">
             <ThemeRow />
             <span className="w-[1px] h-4 bg-white/10" />
             <LanguageToggle />
           </div>
        </div>
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-[#141416]/95 backdrop-blur-md border-t border-white/5 flex items-center justify-around px-2 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2.5 z-50 shadow-[0_-4px_24px_rgba(0,0,0,0.6)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 transform active:scale-95 relative",
                isActive 
                  ? "text-indigo-400 font-semibold" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse" />
              )}
              <item.icon className={cn("w-5.5 h-5.5 transition-transform", isActive ? "scale-110" : "")} />
              <span className="text-[10px] tracking-wide mt-0.5">{item.name}</span>
            </Link>
          );
        })}
        {user ? (
          (() => {
            const isActive = location.pathname === '/profile';
            return (
              <Link
                to="/profile"
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-300 transform active:scale-95 relative",
                  isActive 
                    ? "text-indigo-400 font-semibold" 
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                {isActive && (
                  <div className="absolute -top-1 w-8 h-1 rounded-full bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)] animate-pulse" />
                )}
                <UserIcon className={cn("w-5.5 h-5.5 transition-transform", isActive ? "scale-110" : "")} />
                <span className="text-[10px] tracking-wide mt-0.5">{t('nav.profile')}</span>
              </Link>
            );
          })()
        ) : (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl text-slate-400 hover:text-slate-200 active:scale-95 transition-all"
          >
            <LogIn className="w-5.5 h-5.5" />
            <span className="text-[10px] tracking-wide mt-0.5">{t('nav.login')}</span>
          </button>
        )}
      </nav>

      {/* Auth Choice Modal */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[999] animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-sm bg-[#141416] border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl overflow-hidden my-auto">
            {/* Background pattern */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex justify-between items-center mb-5 relative z-10">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <h3 className="text-base font-bold text-white">
                  {lang === 'zh' ? '开启你的 ACG 之旅' : 'Join EUROACG Hub'}
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsLoginModalOpen(false);
                  setAuthError('');
                }}
                className="p-1.5 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Logo area */}
            <div className="flex flex-col items-center text-center space-y-3 mb-5 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/5 border border-white/5 p-0.5 overflow-hidden shadow-lg">
                <img 
                  src="/logo.jpg" 
                  alt="EUROACG Logo" 
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">EUROACG</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {lang === 'zh' ? '欧洲首个二次元同好集结地' : 'The premier European ACG Hub'}
                </p>
              </div>
            </div>

            {authError && (
              <div className="mb-4 p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                <p className="text-[11px] text-rose-400 font-medium leading-relaxed">{authError}</p>
              </div>
            )}

            {/* Google Authentication Section */}
            <div className="space-y-3 relative z-10 mb-4 animate-fadeIn">
              <button
                type="button"
                disabled={authLoading}
                onClick={async () => {
                  const res = await loginWithGoogle();
                  if (res) setIsLoginModalOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-white hover:bg-slate-100 text-slate-900 rounded-2xl font-semibold text-xs transition-all active:scale-[0.98] shadow-md"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="font-bold">{lang === 'zh' ? 'Google 谷歌极速登录' : 'Sign in with Google'}</span>
              </button>
            </div>

            {/* Elegant Divider */}
            <div className="relative flex py-2 items-center z-10 mb-3.5">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                {lang === 'zh' ? '或使用邮箱登录' : 'Or via Email'}
              </span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* EMAIL SIGN IN & SIGN UP FORM */}
            <form onSubmit={handleEmailAuth} className="space-y-3.5 relative z-10 animate-fadeIn">
              {emailMode === 'register' && (
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'zh' ? '昵称 / 角色名' : 'Nickname'}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={displayNameState}
                      onChange={(e) => setDisplayNameState(e.target.value)}
                      placeholder={lang === 'zh' ? '你的 ACG 专属昵称' : 'Your display name'}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'zh' ? '电子邮箱' : 'Email Address'}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{lang === 'zh' ? '设置密码' : 'Password'}</label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0A0A0B] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl font-bold text-xs transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2"
              >
                {authLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {emailMode === 'register' 
                    ? (lang === 'zh' ? '立即创建账号' : 'Create Account') 
                    : (lang === 'zh' ? '安全登录' : 'Sign In Safely')}
                </span>
              </button>

              <div className="text-center pt-1.5 border-t border-white/5 mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEmailMode(emailMode === 'login' ? 'register' : 'login');
                    setAuthError('');
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  {emailMode === 'login' 
                    ? (lang === 'zh' ? '还没有账号？点击这里注册' : 'No account? Sign up here') 
                    : (lang === 'zh' ? '已有账号？点击立即登录' : 'Already have an account? Sign in')}
                </button>
              </div>
            </form>

            {/* Diagnostic troubleshooting tips */}
            <div className="mt-4 border-t border-white/5 pt-3.5 text-left relative z-10">
              <details className="group cursor-pointer">
                <summary className="flex items-center justify-between text-[10px] text-slate-500 hover:text-slate-300 transition-colors font-semibold uppercase tracking-wider">
                  <span>⚙️ 部署排查与安全域名提示</span>
                  <span className="transition-transform group-open:rotate-180">▼</span>
                </summary>
                <div className="mt-2 p-2.5 bg-slate-900/60 rounded-xl border border-white/5 text-[10px] text-slate-400 leading-relaxed space-y-1.5">
                  <p>
                    如果您将应用发布到了 <strong>Vercel 或自定义域名</strong>，在按下 Google 登录时若遇到闪退，这是由于 Firebase 的安全授权限制。请按照以下步骤配置：
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>登录你的 <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline font-medium">Firebase 控制台</a></li>
                    <li>前往 <strong>Authentication</strong> &gt; <strong>Settings</strong> &gt; <strong>Authorized domains</strong></li>
                    <li>添加您的 Vercel 域名（例如 <code>euro-acg.vercel.app</code>）即可一秒完美登录！</li>
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

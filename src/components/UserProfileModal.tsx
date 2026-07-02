import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { useLanguage } from './LanguageProvider';
import { 
  X, MapPin, Sparkles, Heart, BookOpen, Camera, Palette, 
  Smile, Copy, Check, ExternalLink, Globe, Star, Mail, Award, Compass
} from 'lucide-react';
import { cn } from '../lib/utils';
import PostContent from './PostContent';
import { motion, AnimatePresence } from 'motion/react';

const EUROPEAN_COUNTRIES = [
  { id: 'NL', name: '荷兰', en: 'Netherlands', flag: '🇳🇱' },
  { id: 'DE', name: '德国', en: 'Germany', flag: '🇩🇪' },
  { id: 'BE', name: '比利时', en: 'Belgium', flag: '🇧🇪' },
  { id: 'FR', name: '法国', en: 'France', flag: '🇫🇷' },
  { id: 'UK', name: '英国', en: 'United Kingdom', flag: '🇬🇧' },
  { id: 'IT', name: '意大利', en: 'Italy', flag: '🇮🇹' },
  { id: 'ES', name: '西班牙', en: 'Spain', flag: '🇪🇸' },
  { id: 'CH', name: '瑞士', en: 'Switzerland', flag: '🇨🇭' },
  { id: 'AT', name: '奥地利', en: 'Austria', flag: '🇦🇹' },
  { id: 'OTHER', name: '其他地区', en: 'Other', flag: '🇪🇺' },
];

interface UserProfileModalContextType {
  showProfile: (uid: string, fallbackData?: { displayName?: string; photoURL?: string }) => void;
}

const UserProfileModalContext = createContext<UserProfileModalContextType | null>(null);

export function useUserProfileModal() {
  const context = useContext(UserProfileModalContext);
  if (!context) {
    throw new Error('useUserProfileModal must be used within a UserProfileModalProvider');
  }
  return context;
}

export function UserProfileModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [fallback, setFallback] = useState<{ displayName?: string; photoURL?: string }>({});
  const { lang } = useLanguage();

  const handleClose = () => {
    setIsOpen(false);
    if (window.history.state?.modal === 'profile') {
      window.history.back();
    }
  };

  const showProfile = (uid: string, fallbackData?: { displayName?: string; photoURL?: string }) => {
    setProfileUid(uid);
    setFallback(fallbackData || {});
    setIsOpen(true);
    setProfile(null);
    window.history.pushState({ modal: 'profile' }, '');
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modal !== 'profile') {
        setIsOpen(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!profileUid) return;

    const fetchProfileData = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'users', profileUid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Failed to fetch public profile', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [profileUid]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getRoleLabel = (role: UserRole) => {
    const roles: Record<UserRole, { zh: string; en: string; color: string; icon: React.ReactNode }> = {
      coser: { zh: 'Coser / 角色扮演者', en: 'Coser / Cosplayer', color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-400', icon: <Star className="w-3.5 h-3.5 text-pink-400" /> },
      photographer: { zh: '摄影师 / Photographer', en: 'Photographer', color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400', icon: <Camera className="w-3.5 h-3.5 text-blue-400" /> },
      makeup: { zh: '妆娘/妆造 / Makeup Artist', en: 'Makeup Artist', color: 'from-purple-500/20 to-fuchsia-500/10 border-purple-500/30 text-purple-400', icon: <Palette className="w-3.5 h-3.5 text-purple-400" /> },
      fan: { zh: '有爱同好 / ACG Fan', en: 'ACG Fan', color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400', icon: <Smile className="w-3.5 h-3.5 text-emerald-400" /> },
      other: { zh: '多重身份 / Other', en: 'Multi-Identity / Other', color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400', icon: <Compass className="w-3.5 h-3.5 text-amber-400" /> }
    };
    return roles[role] || roles.other;
  };

  const currentProfile = profile || (profileUid ? {
    uid: profileUid,
    displayName: fallback.displayName || (lang === 'zh' ? '有爱同好' : 'EuroACG Fan'),
    photoURL: fallback.photoURL || '',
    bio: lang === 'zh' ? '这个小伙伴还没有填写个性签名哦~' : 'No biography provided yet.',
    role: 'other' as UserRole,
    favorites: { anime: '', characters: '', cp: '' },
    socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
  } as UserProfile : null);

  const roleInfo = currentProfile ? getRoleLabel(currentProfile.role) : null;

  return (
    <UserProfileModalContext.Provider value={{ showProfile }}>
      {children}
      
      <AnimatePresence>
        {isOpen && currentProfile && (
          <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={handleClose} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#141416] rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.15)] w-full max-w-lg overflow-hidden relative z-10 max-h-[90vh] flex flex-col"
            >
              {/* Card Header Background Gradient */}
              <div className="h-28 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/30 absolute top-0 inset-x-0 border-b border-white/5" />
              
              {/* Close Button */}
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 p-2.5 text-slate-400 hover:text-white rounded-full bg-[#141416]/60 backdrop-blur-md border border-white/5 hover:bg-white/10 transition-all z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 md:p-8 pt-16 relative flex-1 overflow-y-auto scrollbar-none space-y-6">
                {/* User Identity Section */}
                <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
                  {/* Glowing Avatar */}
                  <div className="relative group shrink-0">
                    <div className="absolute -inset-0.5 bg-gradient-to-tr from-pink-500 via-indigo-500 to-purple-500 rounded-full blur-sm opacity-50 group-hover:opacity-100 transition duration-500" />
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-pink-500 to-indigo-500 p-1">
                      <div className="w-full h-full rounded-full bg-[#141416] flex items-center justify-center font-bold text-white text-3xl overflow-hidden">
                        {currentProfile.photoURL ? (
                          <img src={currentProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          currentProfile.displayName?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0 w-full">
                    {/* Role Tag */}
                    {roleInfo && (
                      <div className={cn(
                        "inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r rounded-full text-xs font-bold border",
                        roleInfo.color
                      )}>
                        {roleInfo.icon}
                        <span>{lang === 'zh' ? roleInfo.zh : roleInfo.en}</span>
                      </div>
                    )}

                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                      {currentProfile.displayName}
                    </h2>
                  </div>
                </div>

                {/* Countries List (Resident & Planning) */}
                {(currentProfile.residentCountries?.length || 0) + (currentProfile.visitCountries?.length || 0) > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
                    {currentProfile.residentCountries?.map(code => {
                      const country = EUROPEAN_COUNTRIES.find(c => c.id === code);
                      if (!country) return null;
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{country.flag}</span>
                          <span>{lang === 'zh' ? `${country.name} (常驻)` : `${country.en} (Resident)`}</span>
                        </span>
                      );
                    })}
                    {currentProfile.visitCountries?.map(code => {
                      const country = EUROPEAN_COUNTRIES.find(c => c.id === code);
                      if (!country) return null;
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-full">
                          <Compass className="w-3 h-3 text-emerald-400" />
                          <span>{country.flag}</span>
                          <span>{lang === 'zh' ? `${country.name} (规划去)` : `${country.en} (Planned)`}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Fandoms / XP Preferences Card */}
                {currentProfile.favorites && (currentProfile.favorites.anime || currentProfile.favorites.characters || currentProfile.favorites.cp) && (
                  <div className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/5 rounded-3xl p-5 space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-2.5">
                      <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />
                      <span>{lang === 'zh' ? '本命档案与XP系统' : 'Fandom Profile & Favorites'}</span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      {currentProfile.favorites.anime && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/[0.02] pb-2.5 last:border-0 last:pb-0">
                          <span className="text-slate-400 font-medium sm:w-28 shrink-0">{lang === 'zh' ? '常驻坑/墙头:' : 'Main Fandoms:'}</span>
                          <span className="text-white font-semibold">{currentProfile.favorites.anime}</span>
                        </div>
                      )}
                      {currentProfile.favorites.characters && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/[0.02] pb-2.5 last:border-0 last:pb-0">
                          <span className="text-slate-400 font-medium sm:w-28 shrink-0">{lang === 'zh' ? '单推/本命角色:' : 'Favorite Characters:'}</span>
                          <span className="text-white font-semibold text-rose-300">{currentProfile.favorites.characters}</span>
                        </div>
                      )}
                      {currentProfile.favorites.cp && (
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-4 border-b border-white/[0.02] pb-2.5 last:border-0 last:pb-0">
                          <span className="text-slate-400 font-medium sm:w-28 shrink-0">{lang === 'zh' ? '主推CP:' : 'Favorite Ship / CP:'}</span>
                          <span className="text-pink-400 font-semibold flex items-center gap-1">
                            💗 {currentProfile.favorites.cp}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Biography / Description */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>{lang === 'zh' ? '关于我 / 个人自述' : 'About Me / Biography'}</span>
                  </div>
                  <div className="text-sm text-slate-300 bg-white/5 p-4 rounded-3xl border border-white/5 leading-relaxed max-h-48 overflow-y-auto scrollbar-thin">
                    {currentProfile.bio ? (
                      <PostContent content={currentProfile.bio} />
                    ) : (
                      <p className="italic text-slate-500 text-center py-2">{lang === 'zh' ? '这个小伙伴还没有填写个性签名哦~' : 'No biography provided yet.'}</p>
                    )}
                  </div>
                </div>

                {/* Social Contacts Section */}
                {currentProfile.socials && Object.values(currentProfile.socials).some(val => !!val) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'zh' ? '同好扩列渠道' : 'Social Connections'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(currentProfile.socials).map(([key, value]) => {
                        const strValue = value as string;
                        if (!strValue) return null;
                        
                        // Map social networks
                        const labels: Record<string, { name: string; prefix?: string; isUrl?: boolean }> = {
                          instagram: { name: 'Instagram', prefix: '@', isUrl: true },
                          x: { name: 'X / Twitter', prefix: '@', isUrl: true },
                          xiaohongshu: { name: lang === 'zh' ? '小红书' : 'RED', prefix: 'ID: ' },
                          wechat: { name: lang === 'zh' ? '微信' : 'WeChat', prefix: 'ID: ' },
                          qq: { name: 'QQ', prefix: 'ID: ' }
                        };
                        const net = labels[key] || { name: key };

                        return (
                          <div 
                            key={key} 
                            onClick={() => handleCopy(strValue, key)}
                            className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 hover:border-indigo-500/20 transition-all cursor-pointer group"
                            title={lang === 'zh' ? '点击复制联系方式' : 'Click to copy handle'}
                          >
                            <div className="flex flex-col min-w-0">
                              <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">{net.name}</span>
                              <span className="text-xs text-white font-medium truncate mt-0.5">{net.prefix}{strValue}</span>
                            </div>
                            <button className="text-slate-400 group-hover:text-white transition-colors shrink-0">
                              {copiedField === key ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400 animate-scaleIn" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Close Button at bottom */}
              <div className="px-6 md:px-8 pb-4 pt-1 bg-[#141416] flex gap-3">
                <button
                  onClick={handleClose}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 transition-all text-xs font-bold rounded-2xl text-slate-300 hover:text-white border border-white/5 flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>{lang === 'zh' ? '关闭档案' : 'Close Profile'}</span>
                </button>
              </div>

              {/* Footer Stamp */}
              <div className="p-4 bg-white/[0.02] border-t border-white/5 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-semibold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 text-indigo-500" />
                <span>EuroACG Member File</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </UserProfileModalContext.Provider>
  );
}

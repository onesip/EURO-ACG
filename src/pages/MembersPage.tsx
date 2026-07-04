import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { useLanguage } from '../components/LanguageProvider';
import { useAuth } from '../components/AuthProvider';
import { useUserProfileModal } from '../components/UserProfileModal';
import { Search, Users, MapPin, Sparkles, Filter, Globe, Heart, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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
  { id: 'FI', name: '芬兰', en: 'Finland', flag: '🇫🇮' },
  { id: 'RU', name: '俄罗斯', en: 'Russia', flag: '🇷🇺' },
  { id: 'OTHER', name: '其他地区', en: 'Other', flag: '🇪🇺' },
];

export default function MembersPage() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const { showProfile } = useUserProfileModal();

  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL'); // 'ALL' or country ID
  const [selectedRole, setSelectedRole] = useState<string>('ALL'); // 'ALL' or UserRole
  const [countryFilterMode, setCountryFilterMode] = useState<'resident' | 'all'>('all'); // 'all' (resident + visit) or 'resident' only

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'users'));
        const list = snap.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as UserProfile[];
        setAllUsers(list);
      } catch (err) {
        console.error('Failed to fetch users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // Filter logic
  const filteredUsers = allUsers.filter(u => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.displayName?.toLowerCase().includes(q);
      const matchBio = u.bio?.toLowerCase().includes(q);
      const matchAnime = u.favorites?.anime?.toLowerCase().includes(q);
      const matchChar = u.favorites?.characters?.toLowerCase().includes(q);
      if (!matchName && !matchBio && !matchAnime && !matchChar) {
        return false;
      }
    }

    // 2. Role Filter
    if (selectedRole !== 'ALL' && u.role !== selectedRole) {
      return false;
    }

    // 3. Country Filter
    if (selectedCountry !== 'ALL') {
      const residents = u.residentCountries || [];
      const visitors = u.visitCountries || [];
      
      if (countryFilterMode === 'resident') {
        return residents.includes(selectedCountry);
      } else {
        return residents.includes(selectedCountry) || visitors.includes(selectedCountry);
      }
    }

    return true;
  });

  const getRoleBadge = (role: UserRole) => {
    const map: Record<UserRole, { labelZh: string; labelEn: string; color: string; bg: string }> = {
      coser: { labelZh: 'Coser / 角色扮演者', labelEn: 'Cosplayer', color: 'text-pink-400 border-pink-500/20', bg: 'bg-pink-500/10' },
      photographer: { labelZh: '摄影师 / 摄像', labelEn: 'Photographer', color: 'text-sky-400 border-sky-500/20', bg: 'bg-sky-500/10' },
      makeup: { labelZh: '妆造师 / 化妆师', labelEn: 'Makeup Artist', color: 'text-teal-400 border-teal-500/20', bg: 'bg-teal-500/10' },
      fan: { labelZh: '普通同好 / ACG Fan', labelEn: 'ACG Fan', color: 'text-violet-400 border-violet-500/20', bg: 'bg-violet-500/10' },
      other: { labelZh: '次元居民', labelEn: 'Moyu Resident', color: 'text-slate-400 border-slate-500/20', bg: 'bg-slate-500/10' }
    };
    const r = map[role] || map['other'];
    return (
      <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider shrink-0", r.color, r.bg)}>
        {lang === 'zh' ? r.labelZh : r.labelEn}
      </span>
    );
  };

  const getGenderIcon = (gender?: string) => {
    if (gender === 'male') return <span className="text-blue-400 ml-1.5" title="♂ Male">♂</span>;
    if (gender === 'female') return <span className="text-pink-400 ml-1.5" title="♀ Female">♀</span>;
    return null;
  };

  const getCountryName = (code: string) => {
    const c = EUROPEAN_COUNTRIES.find(item => item.id === code);
    if (!c) return code;
    return lang === 'zh' ? `${c.flag} ${c.name}` : `${c.flag} ${c.en}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-10 animate-fadeIn pb-24 md:pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
            <span>{lang === 'zh' ? '次元羁绊 · 同好名册' : 'ACG Soul Connect'}</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-1">
            {lang === 'zh' 
              ? '寻找身在欧洲各个国家的 Coser、摄影、妆娘以及同好伙伴，一键缔结死党契约！' 
              : 'Find cosplayers, makeup artists, photographers and fans across Europe, and bind your contracts!'}
          </p>
        </div>
      </div>

      {/* Control Panel: Search & Filtering */}
      <div className="bg-[#141416]/60 border border-white/5 p-4 rounded-2xl mb-6 space-y-4 shadow-xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'zh' ? '搜索名字、个人简介或本命动漫角色...' : 'Search by name, bio or favorite anime...'}
            className="w-full pl-11 pr-4 py-3 bg-[#0A0A0B] border border-white/5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
          />
        </div>

        {/* Region & Role Filters */}
        <div className="space-y-3">
          {/* Countries Tabs */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              <span>{lang === 'zh' ? '按欧洲国家/地区筛选' : 'Filter by European Country'}</span>
            </label>
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1 max-h-24 overflow-y-auto no-scrollbar">
              <button
                onClick={() => setSelectedCountry('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shrink-0",
                  selectedCountry === 'ALL'
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "bg-[#1b1c23] text-slate-400 hover:text-white border border-white/5"
                )}
              >
                🌍 {lang === 'zh' ? '全欧洲' : 'All Europe'}
              </button>
              {EUROPEAN_COUNTRIES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCountry(c.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 shrink-0",
                    selectedCountry === c.id
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-[#1b1c23] text-slate-400 hover:text-white border border-white/5"
                  )}
                >
                  <span>{c.flag}</span>
                  <span>{lang === 'zh' ? c.name : c.en}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Role Filter & Sub-filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1 border-t border-white/5">
            {/* Roles */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setSelectedRole('ALL')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  selectedRole === 'ALL'
                    ? "bg-white/15 text-white"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                {lang === 'zh' ? '全部职业' : 'All Roles'}
              </button>
              <button
                onClick={() => setSelectedRole('coser')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  selectedRole === 'coser'
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                Coser
              </button>
              <button
                onClick={() => setSelectedRole('photographer')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  selectedRole === 'photographer'
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                {lang === 'zh' ? '摄影' : 'Photographer'}
              </button>
              <button
                onClick={() => setSelectedRole('makeup')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  selectedRole === 'makeup'
                    ? "bg-teal-500/20 text-teal-400 border border-teal-500/30"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                {lang === 'zh' ? '妆造' : 'Makeup'}
              </button>
              <button
                onClick={() => setSelectedRole('fan')}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0",
                  selectedRole === 'fan'
                    ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                    : "bg-white/5 text-slate-400 hover:text-slate-200"
                )}
              >
                {lang === 'zh' ? '同好' : 'Fan'}
              </button>
            </div>

            {/* Country Residence vs Planning toggle */}
            {selectedCountry !== 'ALL' && (
              <div className="flex items-center gap-1.5 bg-[#0A0A0B] p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setCountryFilterMode('all')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                    countryFilterMode === 'all'
                      ? "bg-[#1b1c23] text-white border border-white/5"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {lang === 'zh' ? '所有同好(常驻+规划)' : 'All (Residents + Planners)'}
                </button>
                <button
                  onClick={() => setCountryFilterMode('resident')}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                    countryFilterMode === 'resident'
                      ? "bg-[#1b1c23] text-white border border-white/5"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  🏡 {lang === 'zh' ? '仅限常驻' : 'Residents Only'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Empty states */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-[#1b1c23]/50 border border-white/5 rounded-2xl" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-20 bg-[#141416]/30 border border-dashed border-white/5 rounded-3xl p-6">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-4">
            🔍
          </div>
          <h3 className="text-sm font-bold text-slate-200 mb-1">
            {lang === 'zh' ? '未找到匹配的同好伙伴哦' : 'No matching ACG friends found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {lang === 'zh' 
              ? '尝试更换搜索词，或者查看其他国家，也可以点击下方按钮去添加你的专属档案哦！' 
              : 'Try checking other countries, adjust filters, or share your profile to get discovered!'}
          </p>
        </div>
      ) : (
        /* Results Grid */
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredUsers.map((member) => {
              const residents = member.residentCountries || [];
              const visitors = member.visitCountries || [];
              
              return (
                <motion.div
                  layout
                  key={member.uid}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#1b1c23]/80 hover:bg-[#1b1c23] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-lg relative overflow-hidden group hover:shadow-indigo-500/5 hover:-translate-y-0.5"
                >
                  {/* Subtle glowing halo on card hover */}
                  <div className="absolute inset-x-0 -top-40 h-40 bg-gradient-to-b from-indigo-500/5 to-transparent blur-2xl group-hover:from-indigo-500/10 pointer-events-none transition-all duration-300" />
                  
                  <div>
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-4 mb-4 relative z-10">
                      <div className="flex items-center gap-3">
                        <img
                          src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`}
                          alt={member.displayName}
                          onClick={() => showProfile(member.uid)}
                          className="w-12 h-12 rounded-full object-cover border border-white/10 ring-2 ring-indigo-500/10 hover:ring-indigo-500/50 cursor-pointer transition-all duration-300"
                        />
                        <div>
                          <h3 
                            onClick={() => showProfile(member.uid)}
                            className="font-bold text-white text-sm tracking-tight flex items-center hover:text-indigo-400 cursor-pointer transition-colors"
                          >
                            <span>{member.displayName}</span>
                            {getGenderIcon(member.gender)}
                          </h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {getRoleBadge(member.role)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Geography Section */}
                    <div className="space-y-1.5 mb-4 border-t border-b border-white/5 py-3 text-xs">
                      {residents.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-slate-500 shrink-0">🏡 {lang === 'zh' ? '常驻地区:' : 'Resident:'}</span>
                          <span className="font-semibold flex flex-wrap gap-1">
                            {residents.map(code => (
                              <span key={code} className="bg-white/5 px-2 py-0.5 rounded-md text-[10px] text-slate-300">
                                {getCountryName(code)}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {visitors.length > 0 && (
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <span className="text-slate-500 shrink-0">✈️ {lang === 'zh' ? '计划前往:' : 'Planning:'}</span>
                          <span className="font-semibold flex flex-wrap gap-1">
                            {visitors.map(code => (
                              <span key={code} className="bg-white/5 px-2 py-0.5 rounded-md text-[10px] text-slate-300">
                                {getCountryName(code)}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      {residents.length === 0 && visitors.length === 0 && (
                        <div className="text-[10px] text-slate-500">
                          📍 {lang === 'zh' ? '暂未填写地区信息' : 'No country information updated'}
                        </div>
                      )}
                    </div>

                    {/* Favorite / CP system */}
                    {(member.favorites?.anime || member.favorites?.characters) && (
                      <div className="bg-[#0A0A0B]/60 border border-white/5 rounded-xl p-3 mb-4 space-y-1.5">
                        <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1">
                          <Heart className="w-3 h-3 fill-pink-400" />
                          <span>{lang === 'zh' ? '本命档案 & 墙头' : 'Main Faves & CP'}</span>
                        </p>
                        {member.favorites.anime && (
                          <p className="text-xs text-slate-300 line-clamp-1">
                            <span className="text-slate-500 text-[10px]">{lang === 'zh' ? '作品:' : 'Series:'} </span>
                            {member.favorites.anime}
                          </p>
                        )}
                        {member.favorites.characters && (
                          <p className="text-xs text-slate-300 line-clamp-1">
                            <span className="text-slate-500 text-[10px]">{lang === 'zh' ? '本命角色:' : 'Fav Character:'} </span>
                            {member.favorites.characters}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bio */}
                    {member.bio && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed italic mb-4">
                        &ldquo;{member.bio}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Button Action */}
                  <button
                    onClick={() => showProfile(member.uid)}
                    className="w-full mt-auto py-2 bg-[#0A0A0B] hover:bg-indigo-600 border border-white/5 hover:border-indigo-500 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 group/btn"
                  >
                    <span>{lang === 'zh' ? '缔结契约 / 🔍查看档案' : 'Connect / View File'}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-50 group-hover/btn:translate-x-0.5 group-hover/btn:opacity-100 transition-all" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc, setDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole, Gender, UserReview, FriendRequest } from '../types';
import { useLanguage } from './LanguageProvider';
import { useAuth } from './AuthProvider';
import { 
  X, MapPin, Sparkles, Heart, BookOpen, Camera, Palette, 
  Smile, Copy, Check, ExternalLink, Globe, Star, Mail, Award, Compass, RefreshCw,
  UserPlus, UserMinus, UserCheck, MessageSquare, Send
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
  
  // Friend System State
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'friends'>('none');
  const [friendRequestId, setFriendRequestId] = useState<string | null>(null);
  
  // Review System State
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [newReview, setNewReview] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const { user, profile: currentUserProfile } = useAuth();
  const { t, lang } = useLanguage();

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => {
      setProfileUid(null);
      setProfile(null);
      setReviews([]);
      setFriendStatus('none');
    }, 300);
    if (window.history.state?.modal === 'profile') {
      window.history.back();
    }
  };

  const showProfile = (uid: string, fallbackData?: { displayName?: string; photoURL?: string }) => {
    setProfileUid(uid);
    setFallback(fallbackData || {});
    setProfile(null);
    setReviews([]);
    setIsOpen(true);
    window.history.pushState({ modal: 'profile' }, '');
  };

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state?.modal !== 'profile') {
        setIsOpen(false);
        setProfileUid(null);
        setProfile(null);
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

    // Fetch Reviews
    const reviewsRef = collection(db, 'users', profileUid, 'reviews');
    const qReviews = query(reviewsRef, orderBy('createdAt', 'desc'));
    const unsubReviews = onSnapshot(qReviews, (snap) => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }) as UserReview));
    });

    // Check Friend Status
    let unsubFriends = () => {};
    if (user && user.uid !== profileUid) {
      const q1 = query(collection(db, 'friendRequests'), where('fromId', '==', user.uid), where('toId', '==', profileUid));
      const q2 = query(collection(db, 'friendRequests'), where('fromId', '==', profileUid), where('toId', '==', user.uid));
      
      const unsub1 = onSnapshot(q1, (snap) => {
        if (!snap.empty) {
          const req = snap.docs[0].data() as FriendRequest;
          setFriendRequestId(snap.docs[0].id);
          if (req.status === 'accepted') setFriendStatus('friends');
          else setFriendStatus('pending_sent');
        }
      });
      const unsub2 = onSnapshot(q2, (snap) => {
        if (!snap.empty) {
          const req = snap.docs[0].data() as FriendRequest;
          setFriendRequestId(snap.docs[0].id);
          if (req.status === 'accepted') setFriendStatus('friends');
          else setFriendStatus('pending_received');
        }
      });
      unsubFriends = () => { unsub1(); unsub2(); };
    }

    return () => {
      unsubReviews();
      unsubFriends();
    };
  }, [profileUid, user]);

  const handleAddFriend = async () => {
    if (!user || !profileUid || !currentUserProfile) return;
    try {
      await addDoc(collection(db, 'friendRequests'), {
        fromId: user.uid,
        fromName: currentUserProfile.displayName,
        fromPhoto: currentUserProfile.photoURL,
        toId: profileUid,
        status: 'pending',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptFriend = async () => {
    if (!friendRequestId || !user || !profileUid) return;
    try {
      await updateDoc(doc(db, 'friendRequests', friendRequestId), { status: 'accepted' });
      // Also add to friends subcollection for both
      await setDoc(doc(db, 'users', user.uid, 'friends', profileUid), { uid: profileUid, createdAt: serverTimestamp() });
      await setDoc(doc(db, 'users', profileUid, 'friends', user.uid), { uid: user.uid, createdAt: serverTimestamp() });
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profileUid || !newReview.trim() || !currentUserProfile) return;
    setIsSubmittingReview(true);
    try {
      await addDoc(collection(db, 'users', profileUid, 'reviews'), {
        authorId: user.uid,
        authorName: currentUserProfile.displayName,
        authorPhoto: currentUserProfile.photoURL,
        content: newReview,
        createdAt: serverTimestamp()
      });
      setNewReview('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

  const getGenderIcon = (gender?: Gender) => {
    switch (gender) {
      case 'male': return <span className="text-blue-400" title="Male">♂️</span>;
      case 'female': return <span className="text-pink-400" title="Female">♀️</span>;
      case 'non-binary': return <span className="text-purple-400" title="Non-binary">⚧️</span>;
      case 'other': return <span className="text-amber-400" title="Other">✨</span>;
      default: return null;
    }
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
          <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-hidden">
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
                      <div className="w-full h-full rounded-full bg-[#141416] flex items-center justify-center font-bold text-white text-3xl overflow-hidden relative">
                        {currentProfile.photoURL ? (
                          <img src={currentProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          currentProfile.displayName?.charAt(0).toUpperCase() || 'U'
                        )}
                        {loading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[1px]">
                            <RefreshCw className="w-6 h-6 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0 w-full">
                    {/* Role Tag & Gender */}
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      {loading ? (
                        <div className="h-6 w-32 bg-white/5 rounded-full animate-pulse" />
                      ) : roleInfo && (
                        <div className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r rounded-full text-xs font-bold border",
                          roleInfo.color
                        )}>
                          {roleInfo.icon}
                          <span>{lang === 'zh' ? roleInfo.zh : roleInfo.en}</span>
                        </div>
                      )}
                      {!loading && currentProfile.gender && (
                        <div className="bg-white/5 border border-white/5 rounded-full px-2 py-1 text-sm flex items-center justify-center">
                          {getGenderIcon(currentProfile.gender)}
                        </div>
                      )}
                    </div>

                    <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate flex items-center justify-center sm:justify-start gap-2">
                      {loading && !profile ? (
                        <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse" />
                      ) : currentProfile.displayName}
                    </h2>
                  </div>
                </div>

                {/* Friend Actions */}
                {user && user.uid !== profileUid && !loading && (
                  <div className="flex justify-center sm:justify-start gap-3">
                    {friendStatus === 'none' && (
                      <button 
                        onClick={handleAddFriend}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                      >
                        <UserPlus className="w-4 h-4" />
                        {lang === 'zh' ? '加个好友' : 'Add Friend'}
                      </button>
                    )}
                    {friendStatus === 'pending_sent' && (
                      <button className="flex items-center gap-2 px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-sm font-bold cursor-default">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {lang === 'zh' ? '已发送请求' : 'Request Sent'}
                      </button>
                    )}
                    {friendStatus === 'pending_received' && (
                      <button 
                        onClick={handleAcceptFriend}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 animate-pulse"
                      >
                        <UserCheck className="w-4 h-4" />
                        {lang === 'zh' ? '通过好友请求' : 'Accept Friend'}
                      </button>
                    )}
                    {friendStatus === 'friends' && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-xl text-sm font-bold">
                        <Heart className="w-4 h-4 fill-indigo-400" />
                        {lang === 'zh' ? '已是同好好友' : 'Friends'}
                      </div>
                    )}
                  </div>
                )}

                {/* Countries List */}
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

                {/* Biography */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <span>{lang === 'zh' ? '关于我 / 个人自述' : 'About Me / Biography'}</span>
                  </div>
                  <div className="text-sm text-slate-300 bg-white/5 p-4 rounded-3xl border border-white/5 leading-relaxed max-h-48 overflow-y-auto scrollbar-none">
                    {currentProfile.bio ? (
                      <PostContent content={currentProfile.bio} />
                    ) : (
                      <p className="italic text-slate-500 text-center py-2">{lang === 'zh' ? '这个小伙伴还没有填写个性签名哦~' : 'No biography provided yet.'}</p>
                    )}
                  </div>
                </div>

                {/* User Reviews / Impressions (Impressions Section) */}
                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                      <MessageSquare className="w-4 h-4" />
                      <span>{lang === 'zh' ? '大家对TA的印象' : 'Member Impressions'}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">{reviews.length} {lang === 'zh' ? '条印象' : 'Impressions'}</span>
                  </div>

                  {/* Impression Danmaku/List */}
                  <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-none pr-1">
                    {reviews.length === 0 ? (
                      <div className="text-center py-6 bg-white/[0.02] rounded-2xl border border-dashed border-white/5">
                        <p className="text-xs text-slate-500">{lang === 'zh' ? '暂无印象，快来留下TA给你的第一印象吧！' : 'No impressions yet. Be the first!'}</p>
                      </div>
                    ) : (
                      reviews.map((rev) => (
                        <div key={rev.id} className="bg-white/5 p-3 rounded-2xl border border-white/5 flex gap-3 group animate-fadeIn">
                          <img src={rev.authorPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rev.authorId}`} className="w-8 h-8 rounded-full shrink-0 border border-white/10" alt="Avatar" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] font-bold text-slate-400 truncate">{rev.authorName}</span>
                              <span className="text-[8px] text-slate-600 font-medium">{rev.createdAt?.toMillis() ? new Date(rev.createdAt.toMillis()).toLocaleDateString() : ''}</span>
                            </div>
                            <p className="text-xs text-slate-200 leading-relaxed">{rev.content}</p>
                          </div>
                          {user && (user.uid === rev.authorId || user.uid === profileUid) && (
                            <button 
                              onClick={() => deleteDoc(doc(db, 'users', profileUid, 'reviews', rev.id))}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Review Form */}
                  {user && user.uid !== profileUid && (
                    <form onSubmit={handleSubmitReview} className="flex gap-2">
                      <input 
                        type="text"
                        value={newReview}
                        onChange={e => setNewReview(e.target.value)}
                        placeholder={lang === 'zh' ? '留下你的印象 (如: 妆面超绝、神仙摄影...)' : 'Add an impression...'}
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                        maxLength={100}
                      />
                      <button 
                        type="submit"
                        disabled={isSubmittingReview || !newReview.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </div>

                {/* Social Contacts Section */}
                {currentProfile.socials && Object.values(currentProfile.socials).some(val => !!val) && (
                  <div className="space-y-3 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-white/5 pb-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>{lang === 'zh' ? '同好扩列渠道' : 'Social Connections'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {Object.entries(currentProfile.socials).map(([key, value]) => {
                        const strValue = value as string;
                        if (!strValue) return null;
                        
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

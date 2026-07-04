import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import LocationInput from '../components/LocationInput';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import ShareButton from '../components/ShareButton';
import { useUserProfileModal } from '../components/UserProfileModal';
import UserAvatar from '../components/UserAvatar';
import { Activity } from '../types';
import { Calendar as CalendarIcon, MapPin, Users, Plus, X, Globe, Sparkles, Edit, Trash2, Pin, AlertCircle } from 'lucide-react';
import { GUEST_LIST_LIMIT, USER_LIST_LIMIT, EMERGENCY_GUEST_FIRESTORE_OFF } from '../config/limits';
import { collection, addDoc, serverTimestamp, updateDoc, doc, getDoc, query, orderBy, deleteDoc, arrayUnion, arrayRemove, limit, getDocs, where } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';
import { loadFromCache, saveToCache } from '../lib/cache';

const EUROPEAN_COUNTRIES = [
  { id: 'NL', name: '荷兰', flag: '🇳🇱', en: 'Netherlands' },
  { id: 'DE', name: '德国', flag: '🇩🇪', en: 'Germany' },
  { id: 'BE', name: '比利时', flag: '🇧🇪', en: 'Belgium' },
  { id: 'FR', name: '法国', flag: '🇫🇷', en: 'France' },
  { id: 'UK', name: '英国', flag: '🇬🇧', en: 'UK' },
  { id: 'IT', name: '意大利', flag: '🇮🇹', en: 'Italy' },
  { id: 'ES', name: '西班牙', flag: '🇪🇸', en: 'Spain' },
  { id: 'CH', name: '瑞士', flag: '🇨🇭', en: 'Switzerland' },
  { id: 'AT', name: '奥地利', flag: '🇦🇹', en: 'Austria' },
  { id: 'FI', name: '芬兰', flag: '🇫🇮', en: 'Finland' },
  { id: 'RU', name: '俄罗斯', flag: '🇷🇺', en: 'Russia' },
  { id: 'OTHER', name: '其他地区', flag: '🇪🇺', en: 'Other' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [joiningNoteId, setJoiningNoteId] = useState<string | null>(null);
  const [participantNote, setParticipantNote] = useState('');
  const [indexRequired, setIndexRequired] = useState(false);
  const { user, profile, setQuotaExceeded, isQuotaExceeded, openLoginModal } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const sharedId = queryParams.get('id');

  useEffect(() => {
    if (sharedId && activities.length > 0) {
      const activity = activities.find(a => a.id === sharedId);
      if (activity) {
        const originalTitle = document.title;
        const newTitle = lang === 'zh' ? `团咪开团我秒跟：${activity.title}` : `Join my activity: ${activity.title}`;
        document.title = newTitle;
        
        // Also update meta description if possible (browser side only)
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', activity.description.substring(0, 100));

        return () => { document.title = originalTitle; };
      }
    }
  }, [sharedId, activities, lang]);

  const isAdmin = user?.email === 'zhengjiaru2018@gmail.com' || user?.email === 'info@onesip.nl';

  useEffect(() => {
    setIndexRequired(false);

    setIsLoading(true);

    const fetchData = async () => {
      const queryParams = new URLSearchParams(location.search);
      const sharedId = queryParams.get('id');

      if (!user && EMERGENCY_GUEST_FIRESTORE_OFF && !sharedId) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      try {
        let activitiesData: Activity[] = [];

        // 1. If sharedId is present, try to fetch it first (even for guests)
        if (sharedId) {
          try {
            const sharedDoc = await getDoc(doc(db, 'activities', sharedId));
            if (sharedDoc.exists()) {
              activitiesData.push({ id: sharedDoc.id, ...sharedDoc.data() } as Activity);
            }
          } catch (err) {
            console.error("Failed to fetch shared activity:", err);
          }
        }

        // 2. Fetch the rest of the activities if not in strict guest mode
        // or if we want to show other activities alongside the shared one
        if (user || !EMERGENCY_GUEST_FIRESTORE_OFF) {
          const constraints: any[] = [];
          if (selectedCountry !== 'ALL') {
            constraints.push(where('country', '==', selectedCountry));
          }
          // We sort in memory to avoid requiring complex composite indexes
          // constraints.push(orderBy('createdAt', 'desc'));
          constraints.push(limit(150));

          const q = query(collection(db, 'activities'), ...constraints);
          const snapshot = await getDocs(q);
          
          const queriedActivities: Activity[] = [];
          snapshot.docs.forEach(doc => {
            const data = { id: doc.id, ...doc.data() } as Activity;
            queriedActivities.push(data);
          });

          // Sort by createdAt desc in memory
          queriedActivities.sort((a, b) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
            return timeB - timeA;
          });

          // Limit and add to activitiesData
          const displayLimit = user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT;
          const sliced = queriedActivities.slice(0, displayLimit);
          sliced.forEach(item => {
            if (!activitiesData.find(a => a.id === item.id)) {
              activitiesData.push(item);
            }
          });
        }
        
        // Sort: Pinned first, then by sharedId (if present), then by createdAt desc
        activitiesData.sort((a, b) => {
          if (a.id === sharedId) return -1;
          if (b.id === sharedId) return 1;
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0;
        });

        setActivities(activitiesData);
        setQuotaExceeded(false);
      } catch (error: any) {
        if (error?.code === 'failed-precondition') {
          setIndexRequired(true);
        } else if (error?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else if (error?.code === 'permission-denied') {
          console.error('Firestore Permission Error: ', JSON.stringify({
            error: error.message,
            operationType: 'list',
            path: 'activities',
            authInfo: {
              userId: user?.uid,
              email: user?.email,
              emailVerified: user?.emailVerified,
              isAnonymous: user?.isAnonymous
            }
          }));
        } else {
          console.error("Activities fetch error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, selectedCountry, isQuotaExceeded]);

  const handlePin = async (activityId: string, currentlyPinned: boolean = false) => {
    if (!isAdmin) return;

    setActivities(prev => {
      const updated = prev.map(a => {
        if (a.id === activityId) {
          return { ...a, isPinned: !currentlyPinned };
        }
        return a;
      });
      return updated;
    });

    try {
      await updateDoc(doc(db, 'activities', activityId), {
        isPinned: !currentlyPinned
      });
    } catch (err: any) {
      console.error("Failed to pin activity", err);
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  const handleJoin = async (activityId: string, isJoining: boolean, note?: string) => {
    if (!user || !profile) {
      openLoginModal();
      return;
    }
    
    const participant = { 
      uid: user.uid, 
      role: profile.role, 
      displayName: profile.displayName, 
      photoURL: profile.photoURL,
      notes: note || '' 
    };
    
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    setActivities(prev => {
      const updated = prev.map(a => {
        if (a.id === activityId) {
          const currentParticipants = a.participants || [];
          const updatedParticipants = isJoining
            ? [...currentParticipants.filter(p => p.uid !== user.uid), participant]
            : currentParticipants.filter(p => p.uid !== user.uid);
          return { ...a, participants: updatedParticipants };
        }
        return a;
      });
      return updated;
    });

    try {
      const activityRef = doc(db, 'activities', activityId);
      if (isJoining) {
        await updateDoc(activityRef, {
          participants: arrayUnion(participant)
        });
      } else {
        const pToRemove = activity.participants.find(p => p.uid === user.uid);
        if (pToRemove) {
          await updateDoc(activityRef, {
            participants: arrayRemove(pToRemove)
          });
        }
      }
      setJoiningNoteId(null);
      setParticipantNote('');
    } catch (error: any) {
      console.error("Error joining activity:", error);
      if (error?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  const filteredActivities = activities;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3 uppercase">
            {sharedId ? (lang === 'zh' ? '面基行动详情' : 'Activity Detail') : t('act.title')}
            <span className="text-indigo-500">.</span>
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">
            {sharedId ? (lang === 'zh' ? '正在查看特定活动，点击下方按钮查看更多' : 'Viewing a specific activity, click button below to see more') : t('act.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {sharedId && (
            <button
              onClick={() => {
                window.location.hash = window.location.hash.split('?')[0];
              }}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-white/10 active:scale-95"
            >
              <Globe className="w-4 h-4" />
              {lang === 'zh' ? '查看全部' : 'View All'}
            </button>
          )}
          {user && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-500/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              <span>{t('act.new')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Shared ID Highlight Alert */}
      {sharedId && activities.length > 0 && activities[0].id === sharedId && (
        <div className="space-y-4">
          <div className="p-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl animate-pulse shadow-xl shadow-indigo-500/10">
            <div className="bg-slate-950 px-5 py-4 rounded-[22px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/30">
                  <Sparkles className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">{lang === 'zh' ? '为您直达此活动' : 'Direct link to this activity'}</h3>
                  <p className="text-xs text-slate-400 font-medium">{lang === 'zh' ? '已成功加载分享的内容，您可以查看详情或参与讨论' : 'The shared content has been loaded successfully'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/MicroMessenger/i.test(navigator.userAgent) && !user && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-xs text-amber-300 leading-relaxed">
              <p className="font-bold mb-1">💡 微信用户提示:</p>
              <p>如果您尝试 Google 登录却失败，是因为微信禁用了相关弹出窗口。请点击右上角 <span className="font-bold font-mono">[...]</span> 并选择 <span className="font-bold underline">「在浏览器中打开」</span> 即可完美登录并保留活动进度。</p>
            </div>
          )}
        </div>
      )}

      {!user && EMERGENCY_GUEST_FIRESTORE_OFF && activities.length === 0 ? (
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-8 text-center max-w-2xl mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {lang === 'zh' ? '🌍 圈子限速保护模式' : '🌍 Circle Protection Mode'}
          </h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            {lang === 'zh' 
              ? 'EuroACG 小破站正在限流中。登录后可以查看内容、发帖和找同城搭子。现在也可以先在小红书评论区登记：城市 + 想找什么。' 
              : 'EuroACG is currently in traffic-saving mode. Log in to view posts, join discussions, and find local ACG friends.'}
          </p>
          <div className="text-xs text-slate-500 font-mono">
            {lang === 'zh' ? '未登录游客暂不可读取实时数据库' : 'Guest access restricted to 0 database reads'}
          </div>
        </div>
      ) : (
        <>
          {indexRequired && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-400 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            {lang === 'zh' 
              ? '需要创建 Firestore 复合索引以支持当前筛选。请在 Firebase 控制台创建对应的 Index。' 
              : 'Firestore composite index is required for this query. Please create it in your Firebase Console.'}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
          {lang === 'zh' ? '🌍 圈子过滤 / 切换国家频道' : '🌍 Region Circles / Country Channels'}
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCountry('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCountry === 'ALL'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'zh' ? '全部频道 (All)' : 'All Channels'}</span>
          </button>
          {EUROPEAN_COUNTRIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCountry(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCountry === c.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{c.flag}</span>
              <span>{lang === 'zh' ? c.name : c.en}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">{lang === 'zh' ? '正在连接面基行动...' : 'Connecting to activities...'}</p>
          </div>
        ) : filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => {
            const isParticipant = activity.participants?.some(p => p.uid === user?.uid);
            const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === activity.country);
            
            return (
              <div key={activity.id} className={cn(
                "bg-[#141416] p-6 rounded-2xl border transition-all group relative",
                activity.isPinned ? "border-indigo-500/50 bg-indigo-500/[0.02]" : "border-white/5 hover:border-indigo-500/30"
              )}>
              {activity.isPinned && (
                <div className="absolute -top-2.5 -left-2.5 bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg z-10 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 fill-white" />
                  <span className="text-[10px] font-bold pr-1">{lang === 'zh' ? '置顶' : 'Pinned'}</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between items-start mb-3 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-xs font-semibold uppercase tracking-wider">
                    {t(`act.modal.type.${activity.type}`) || activity.type}
                  </div>
                  {countryInfo && (
                    <div className="px-2.5 py-1 bg-white/5 border border-white/5 text-slate-300 rounded-full text-xs flex items-center gap-1">
                      <span>{countryInfo.flag}</span>
                      <span>{lang === 'zh' ? countryInfo.name : countryInfo.en}</span>
                    </div>
                  )}
                </div>
                {isParticipant && (
                  <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">{t('act.joined')}</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">{activity.title}</h3>
              <div className="mb-4">
                <PostContent content={activity.description} />
              </div>

              {activity.link && (
                <div className="mb-4 p-3 bg-white/5 border border-white/10 rounded-xl flex items-center gap-2 group/link">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <a 
                    href={activity.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs text-indigo-400 hover:text-indigo-300 underline break-all font-medium"
                  >
                    {activity.link}
                  </a>
                </div>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                  {activity.date}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {activity.location}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-slate-400" />
                  {activity.participants?.length || 0} {t('act.participants')}
                </div>
              </div>

              {/* Participants Solitaire Style */}
              {(activity.participants?.length || 0) > 0 && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
                        {lang === 'zh' ? '接龙上车名单' : 'Join The Train'}
                      </span>
                    </div>
                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                      {activity.participants?.length} {lang === 'zh' ? '人已上车' : 'Joined'}
                    </span>
                  </div>
                  <div className="bg-black/40 rounded-3xl border border-white/5 overflow-hidden divide-y divide-white/5 shadow-2xl">
                    {activity.participants?.map((p, i) => (
                      <div key={i} className={cn(
                        "p-4 flex items-start gap-4 transition-colors hover:bg-white/[0.02]",
                        p.uid === user?.uid && "bg-indigo-500/[0.03]"
                      )}>
                        <div className="relative flex-shrink-0">
                          <UserAvatar 
                            uid={p.uid} 
                            photoURL={p.photoURL} 
                            displayName={p.displayName} 
                            size="md" 
                            showGender={false}
                            className={cn(
                              "border-2",
                              p.uid === user?.uid ? "border-indigo-500/50" : "border-white/10"
                            )}
                            onClick={() => showProfile(p.uid, { displayName: p.displayName, photoURL: p.photoURL })}
                          />
                          <div className={cn(
                            "absolute -top-1 -left-1 w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg border",
                            i === 0 ? "bg-amber-500 text-amber-950 border-amber-400" : 
                            i === 1 ? "bg-slate-300 text-slate-800 border-white" :
                            i === 2 ? "bg-orange-600 text-orange-50 border-orange-400" :
                            "bg-slate-800 text-slate-400 border-white/10"
                          )}>
                            {i + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 truncate">
                              <span className={cn(
                                "text-sm font-black truncate",
                                p.uid === user?.uid ? "text-indigo-400" : "text-white"
                              )}>
                                {p.displayName}
                              </span>
                              {p.uid === user?.uid && (
                                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                  {lang === 'zh' ? '我' : 'Me'}
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-slate-500 font-bold px-1.5 py-0.5 bg-white/5 rounded-md uppercase tracking-wider">
                              {p.role}
                            </span>
                          </div>
                          {p.notes && (
                            <div className="mt-2 flex items-start gap-2">
                              <div className="w-1 h-auto min-h-[12px] bg-indigo-500/30 rounded-full mt-1" />
                              <p className="text-xs text-slate-400 font-medium leading-relaxed break-words italic">
                                {p.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/5 mt-4">
                <div className="flex -space-x-2 overflow-hidden shrink-0">
                  {activity.participants?.slice(0, 5).map((p, i) => (
                    <UserAvatar 
                      key={i} 
                      uid={p.uid} 
                      photoURL={p.photoURL} 
                      displayName={p.displayName} 
                      size="sm" 
                      showGender={false}
                      className="border-2 border-[#141416] hover:border-indigo-500 hover:scale-110 hover:z-25"
                      onClick={() => showProfile(p.uid, { displayName: p.displayName, photoURL: p.photoURL })}
                    />
                  ))}
                  {(activity.participants?.length || 0) > 5 && (
                    <div className="inline-block w-8 h-8 rounded-full border-2 border-[#141416] bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300 z-10 relative">
                      +{(activity.participants?.length || 0) - 5}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(user && activity.creatorId === user.uid || isAdmin) && (
                      <div className="flex items-center gap-1.5">
                        {confirmDeleteId === activity.id ? (
                          <div className="flex items-center gap-1 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-rose-400 font-bold">{lang === 'zh' ? '确定删除？' : 'Delete?'}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                setActivities(prev => {
                                  const updated = prev.filter(a => a.id !== activity.id);
                                  return updated;
                                });
                                setConfirmDeleteId(null);
                                try {
                                  await deleteDoc(doc(db, 'activities', activity.id));
                                } catch (err: any) {
                                  console.error(err);
                                  if (err?.code === 'resource-exhausted') {
                                    setQuotaExceeded(true);
                                  }
                                }
                              }}
                              className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-1.5 py-0.5 rounded transition-colors"
                            >
                              {lang === 'zh' ? '是' : 'Yes'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-[9px] text-slate-400 hover:text-slate-200 px-1"
                            >
                              {lang === 'zh' ? '否' : 'No'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handlePin(activity.id, activity.isPinned)}
                                className={cn(
                                  "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-sm",
                                  activity.isPinned 
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                                    : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                                )}
                              >
                                <Pin className={cn("w-3.5 h-3.5", activity.isPinned ? "fill-white" : "")} />
                                {activity.isPinned ? (lang === 'zh' ? '取消置顶' : 'Unpin') : (lang === 'zh' ? '置顶' : 'Pin')}
                              </button>
                            )}
                            {activity.creatorId === user?.uid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingActivity(activity);
                                }}
                                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                <Edit className="w-3.5 h-3.5" /> {lang === 'zh' ? '编辑' : 'Edit'}
                              </button>
                            )}
                            {(activity.creatorId === user?.uid || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(activity.id)}
                                className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> {isAdmin && user?.uid !== activity.creatorId ? (lang === 'zh' ? '管理删除' : 'Admin Del') : (lang === 'zh' ? '删除' : 'Delete')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {joiningNoteId === activity.id ? (
                      <div className="flex items-center gap-2 animate-fadeIn">
                        <input
                          type="text"
                          value={participantNote}
                          autoFocus
                          onChange={(e) => setParticipantNote(e.target.value)}
                          placeholder={lang === 'zh' ? '写个备注(如角色)...' : 'Note (e.g. character)...'}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500 w-32 sm:w-48"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleJoin(activity.id, true, participantNote);
                            if (e.key === 'Escape') setJoiningNoteId(null);
                          }}
                        />
                        <button
                          onClick={() => handleJoin(activity.id, true, participantNote)}
                          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          <Sparkles className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setJoiningNoteId(null)}
                          className="p-2 text-slate-400 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          if (isParticipant) {
                            handleJoin(activity.id, false);
                          } else {
                            setJoiningNoteId(activity.id);
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                          isParticipant 
                            ? 'bg-white/5 text-slate-300 hover:bg-white/10' 
                            : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                        }`}
                      >
                        {isParticipant ? t('act.cancelJoin') : t('act.join')}
                        ({activity.commentCount ?? 0})
                      </button>
                    )}
                    <ShareButton path="" id={activity.id} title={lang === 'zh' ? `团咪开团我秒跟：${activity.title}` : `Join my activity: ${activity.title}`} />
                  </div>
                </div>
              
              <CommentSection parentCollection="activities" parentId={activity.id} />
            </div>
          );
        })
        ) : (
          <div className="text-center py-20 text-slate-400 bg-[#141416] rounded-2xl border border-white/5 flex flex-col items-center">
            {isQuotaExceeded ? (
              <>
                <AlertCircle className="w-12 h-12 mb-4 text-rose-500/50" />
                <p className="text-sm font-medium opacity-80 text-rose-400">
                  {lang === 'zh' ? '数据库暂时无法连接 (额度已耗尽)' : 'Database currently offline (Quota exceeded)'}
                </p>
                <p className="text-xs mt-2 max-w-xs mx-auto opacity-50 text-center">
                  {lang === 'zh' ? '由于今日流量过大，免费额度已用完。请等待自动恢复，或尝试点击上方重试按钮。' : 'Free quota exhausted due to high traffic. Please wait for recovery or try the retry button above.'}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 opacity-20" />
                </div>
                <p className="max-w-xs mx-auto">
                  {lang === 'zh' ? `该频道目前没有活动，快来发布第一个吧！` : `No activities in this channel yet. Be the first to create one!`}
                </p>
              </>
            )}
          </div>
        )}
      </div>

        </>
      )}

      {(isCreateModalOpen || editingActivity) && (
        <CreateActivityModal 
          editActivity={editingActivity || undefined}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingActivity(null);
          }} 
          onActivityCreated={(newAct) => {
            setActivities(prev => {
              const updated = [newAct, ...prev];
              return updated;
            });
          }}
          onActivityUpdated={(updatedAct) => {
            setActivities(prev => {
              const updated = prev.map(a => a.id === updatedAct.id ? { ...a, ...updatedAct } : a);
              return updated;
            });
          }}
        />
      )}
    </div>
  );
}

function CreateActivityModal({ editActivity, onClose, onActivityCreated, onActivityUpdated }: { 
  editActivity?: Activity, 
  onClose: () => void,
  onActivityCreated: (activity: Activity) => void,
  onActivityUpdated: (activity: Activity) => void
}) {
  const { user, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    title: editActivity?.title || '',
    type: editActivity?.type || 'meetup',
    date: editActivity?.date || '',
    location: editActivity?.location || '',
    description: editActivity?.description || '',
    link: editActivity?.link || '',
    country: editActivity?.country || 'NL',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const isEdit = !!editActivity;

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFormValid = () => {
    return (
      formData.title.trim() &&
      formData.date.trim() &&
      formData.location.trim() &&
      formData.description.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    if (!isFormValid()) {
      setTouched({
        title: true,
        date: true,
        location: true,
        description: true,
      });
      return;
    }
    setIsSubmitting(true);
    
    // Generate optimistic activity
    const localActivity: Activity = {
      id: isEdit ? editActivity.id : 'local-act-' + Date.now(),
      ...formData,
      creatorId: user.uid,
      participants: isEdit ? (editActivity.participants ?? []) : [],
      createdAt: isEdit ? editActivity.createdAt : { toMillis: () => Date.now(), toDate: () => new Date() } as any,
      isPinned: isEdit ? (editActivity.isPinned ?? false) : false
    };

    if (isEdit) {
      onActivityUpdated(localActivity);
    } else {
      onActivityCreated(localActivity);
    }

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'activities', editActivity.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'activities'), {
          ...formData,
          creatorId: user.uid,
          participants: [],
          commentCount: 0,
          likeCount: 0,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error: any) {
      console.error(error);
      if (error?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141416] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-none animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isEdit 
                ? (lang === 'zh' ? '✏️ 编辑活动 / Edit Activity' : '✏️ Edit Activity') 
                : t('act.modal.title')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {t('act.modal.name')} <span className="text-rose-500 font-bold">*</span>
            </label>
            <input 
              type="text" 
              value={formData.title}
              onBlur={() => handleBlur('title')}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className={cn(
                "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm",
                touched.title && !formData.title.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
              )}
              placeholder={lang === 'zh' ? 'e.g. 荷兰同好面基会 / 德国漫展组团' : 'e.g. Netherlands Meetup / Germany Cosplay group'}
            />
            {touched.title && !formData.title.trim() && (
              <p className="text-xs text-rose-400 font-semibold mt-1 animate-fadeIn">
                ⚠️ {lang === 'zh' ? '活动名称不能为空！' : 'Activity name is required!'}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {t('act.modal.type')} <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
              >
                <option value="meetup" className="bg-slate-900 text-white">{t('act.modal.type.meetup')}</option>
                <option value="convention" className="bg-slate-900 text-white">{t('act.modal.type.convention')}</option>
                <option value="photoshoot" className="bg-slate-900 text-white">{t('act.modal.type.photoshoot')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {lang === 'zh' ? '活动所属国家' : 'Activity Country'} <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={formData.country}
                onChange={e => setFormData({...formData, country: e.target.value})}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
              >
                {EUROPEAN_COUNTRIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.flag} {lang === 'zh' ? c.name : c.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {t('act.modal.date')} <span className="text-rose-500 font-bold">*</span>
              </label>
              <input 
                type="date" 
                value={formData.date}
                onBlur={() => handleBlur('date')}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className={cn(
                  "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none color-scheme-dark text-sm",
                  touched.date && !formData.date.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
                )}
              />
              {touched.date && !formData.date.trim() && (
                <p className="text-xs text-rose-400 font-semibold mt-1 animate-fadeIn">
                  ⚠️ {lang === 'zh' ? '请选择日期！' : 'Please select a date!'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {t('act.modal.location')} <span className="text-rose-500 font-bold">*</span>
              </label>
              <LocationInput 
                value={formData.location}
                onChange={(value) => {
                  setFormData({...formData, location: value});
                  setTouched(prev => ({ ...prev, location: true }));
                }}
                className={cn(
                  "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm",
                  touched.location && !formData.location.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
                )}
              />
              {touched.location && !formData.location.trim() && (
                <p className="text-xs text-rose-400 font-semibold mt-1 animate-fadeIn">
                  ⚠️ {lang === 'zh' ? '活动地点不能为空！' : 'Location is required!'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {t('act.modal.desc')} <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea 
              rows={3}
              value={formData.description}
              onBlur={() => handleBlur('description')}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className={cn(
                "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none mb-2 text-sm",
                touched.description && !formData.description.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
              )}
              placeholder={lang === 'zh' ? '支持插入多张图片和文字叙述' : 'Explain meetup details and plan. Supports images.'}
            />
            {touched.description && !formData.description.trim() && (
              <p className="text-xs text-rose-400 font-semibold mb-1 animate-fadeIn">
                ⚠️ {lang === 'zh' ? '活动描述不能为空！' : 'Description is required!'}
              </p>
            )}
            <div className="flex justify-start">
              <ImageUpload onUpload={(url) => setFormData(prev => ({...prev, description: prev.description + `\n![图片](${url})\n`}))} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.link')}</label>
            <input 
              type="url" 
              value={formData.link}
              onChange={e => setFormData({...formData, link: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
              placeholder="https://..."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {isSubmitting 
                ? (lang === 'zh' ? '正在保存中...' : 'Saving...') 
                : (isEdit ? (lang === 'zh' ? '保存更改' : 'Save Changes') : t('act.modal.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import LocationInput from '../components/LocationInput';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import { useUserProfileModal } from '../components/UserProfileModal';
import { isQuotaExceeded } from '../lib/quota';
import QuotaBanner from '../components/QuotaBanner';
import UserAvatar from '../components/UserAvatar';
import { Activity } from '../types';
import { Calendar as CalendarIcon, MapPin, Users, Plus, X, Globe, Sparkles, Edit, Trash2, Pin } from 'lucide-react';
import { GUEST_LIST_LIMIT, USER_LIST_LIMIT } from '../config/limits';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, orderBy, deleteDoc, arrayUnion, arrayRemove, limit, getDocs, where } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { cn } from '../lib/utils';

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
  { id: 'OTHER', name: '其他地区', flag: '🇪🇺', en: 'Other' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user, profile, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();

  const isAdmin = user?.email === 'zhengjiaru2018@gmail.com';

  useEffect(() => {
    const cached = localStorage.getItem('cached_activities');
    if (cached) {
      try {
        setActivities(JSON.parse(cached));
      } catch (_) {}
    }
    setIsLoading(false);

    const fetchData = async () => {
      try {
        let q = query(collection(db, 'activities'), limit(user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT));
        
        if (selectedCountry !== 'ALL') {
          q = query(
            collection(db, 'activities'),
            where('country', '==', selectedCountry),
            limit(user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT)
          );
        }

        const snapshot = await getDocs(q);
        setQuotaExceeded(false); // Success! Clear quota if it was set
        
        const activitiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Activity[];
        
        // Sort: Pinned first, then by createdAt desc
        activitiesData.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setActivities(activitiesData);
        localStorage.setItem('cached_activities', JSON.stringify(activitiesData));
      } catch (error: any) {
        if (error?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          console.error("Activities fetch error:", error);
        }
      }
    };
    fetchData();
  }, [user, selectedCountry, isQuotaExceeded]);

  const handlePin = async (activityId: string, currentlyPinned: boolean = false) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'activities', activityId), {
        isPinned: !currentlyPinned
      });
    } catch (err) {
      console.error("Failed to pin activity", err);
    }
  };

  const handleJoin = async (activityId: string, isJoining: boolean) => {
    if (!user || !profile) return alert('Please login to join activities');
    
    const activityRef = doc(db, 'activities', activityId);
    const participant = { uid: user.uid, role: profile.role, displayName: profile.displayName, photoURL: profile.photoURL };
    
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    try {
      if (isJoining) {
        await updateDoc(activityRef, {
          participants: arrayUnion(participant)
        });
      } else {
        // To remove properly, we need to find the exact object or use a different strategy.
        // Since participants contains displayName/photoURL which might be stale, 
        // it's safer to filter and set if we can't guarantee exact match.
        // However, arrayRemove only works with exact matches.
        // For now, let's use the current activity state to find the participant object to remove.
        const pToRemove = activity.participants.find(p => p.uid === user.uid);
        if (pToRemove) {
          await updateDoc(activityRef, {
            participants: arrayRemove(pToRemove)
          });
        }
      }
    } catch (error) {
      console.error("Error joining activity:", error);
      alert("Failed to join. Please try again.");
    }
  };

  const filteredActivities = activities.filter(activity => {
    if (selectedCountry === 'ALL') return true;
    return activity.country === selectedCountry;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('act.title')}</h1>
          <p className="text-slate-400 mt-1">{t('act.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('act.new')}</span>
        </button>
      </div>

      <QuotaBanner />

      {/* Country Filters / 国家活动圈子 */}
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
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
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
              
              <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-4">
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

              <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-4">
                <div className="flex -space-x-2 overflow-hidden">
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
                <div className="flex items-center gap-2">
                  {(user && activity.creatorId === user.uid || isAdmin) && (
                      <div className="flex items-center gap-1.5">
                        {confirmDeleteId === activity.id ? (
                          <div className="flex items-center gap-1 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-lg">
                            <span className="text-[10px] text-rose-400 font-bold">{lang === 'zh' ? '确定删除？' : 'Delete?'}</span>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await deleteDoc(doc(db, 'activities', activity.id));
                                  setConfirmDeleteId(null);
                                } catch (err) {
                                  console.error(err);
                                  alert('Delete failed');
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

                  <button
                    onClick={() => handleJoin(activity.id, !isParticipant)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      isParticipant 
                        ? 'bg-white/5 text-slate-300 hover:bg-white/10' 
                        : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                    }`}
                  >
                    {isParticipant ? t('act.cancelJoin') : t('act.join')}
                    ({activity.commentCount ?? 0})
                  </button>
                </div>
              
              <CommentSection parentCollection="activities" parentId={activity.id} />
            </div>
          );
        })
        ) : (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该频道目前没有活动，快来发布第一个吧！` : `No activities in this channel yet. Be the first to create one!`}
          </div>
        )}
      </div>

      {!user && activities.length >= GUEST_LIST_LIMIT && (
        <div className="text-center py-6 mt-4 border-t border-white/5">
          <p className="text-sm text-slate-400">
            {lang === 'zh' ? '登录后查看更多内容，并加入欧洲二次元同好社区。' : 'Log in to explore more posts and connect with the Euro ACG community.'}
          </p>
        </div>
      )}

      {(isCreateModalOpen || editingActivity) && (
        <CreateActivityModal 
          editActivity={editingActivity || undefined}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingActivity(null);
          }} 
        />
      )}
    </div>
  );
}

function CreateActivityModal({ editActivity, onClose }: { editActivity?: Activity, onClose: () => void }) {
  const { user } = useAuth();
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
    } catch (error) {
      console.error(error);
      alert('Failed to save activity');
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

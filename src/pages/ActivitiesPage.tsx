import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import LocationInput from '../components/LocationInput';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import { Activity } from '../types';
import { Calendar as CalendarIcon, MapPin, Users, Plus, X, Globe, Sparkles } from 'lucide-react';
import { collection, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, query, orderBy } from 'firebase/firestore';

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
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const activitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(activitiesData);
    });
    return unsubscribe;
  }, []);

  const handleJoin = async (activityId: string, isJoining: boolean) => {
    if (!user || !profile) return alert('Please login to join activities');
    
    const activityRef = doc(db, 'activities', activityId);
    const participant = { uid: user.uid, role: profile.role, displayName: profile.displayName, photoURL: profile.photoURL };
    
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;

    try {
      if (isJoining) {
        await updateDoc(activityRef, {
          participants: [...(activity.participants || []), participant]
        });
      } else {
        await updateDoc(activityRef, {
          participants: (activity.participants || []).filter(p => p.uid !== user.uid)
        });
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
        {filteredActivities.map((activity) => {
          const isParticipant = activity.participants?.some(p => p.uid === user?.uid);
          const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === activity.country);
          
          return (
            <div key={activity.id} className="bg-[#141416] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
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
                    <div key={i} className="inline-block w-8 h-8 rounded-full border-2 border-[#141416] bg-indigo-900 flex items-center justify-center text-xs font-medium text-indigo-200 overflow-hidden" title={p.displayName || 'User'}>
                      {p.photoURL ? (
                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" />
                      ) : (
                        (p.displayName || 'U').charAt(0)
                      )}
                    </div>
                  ))}
                  {(activity.participants?.length || 0) > 5 && (
                    <div className="inline-block w-8 h-8 rounded-full border-2 border-[#141416] bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300 z-10 relative">
                      +{(activity.participants?.length || 0) - 5}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleJoin(activity.id, !isParticipant)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isParticipant 
                      ? 'bg-white/5 text-slate-300 hover:bg-white/10' 
                      : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                  }`}
                >
                  {isParticipant ? t('act.cancelJoin') : t('act.join')}
                </button>
              </div>
              
              <CommentSection parentCollection="activities" parentId={activity.id} />
            </div>
          );
        })}
        {filteredActivities.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该频道目前没有活动，快来发布第一个吧！` : `No activities in this channel yet. Be the first to create one!`}
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateActivityModal onClose={() => setIsCreateModalOpen(false)} />
      )}
    </div>
  );
}

function CreateActivityModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [formData, setFormData] = useState({
    title: '',
    type: 'meetup',
    date: '',
    location: '',
    description: '',
    link: '',
    country: 'NL',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'activities'), {
        ...formData,
        creatorId: user.uid,
        participants: [],
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141416] rounded-3xl border border-white/10 shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">{t('act.modal.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.name')}</label>
            <input 
              required
              type="text" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-sm"
              placeholder={lang === 'zh' ? 'e.g. 荷兰同好面基会 / 德国漫展组团' : 'e.g. Netherlands Meetup / Germany Cosplay group'}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.type')}</label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '活动所属国家' : 'Activity Country'}</label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.date')}</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none color-scheme-dark text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.location')}</label>
              <LocationInput 
                required
                value={formData.location}
                onChange={(value) => setFormData({...formData, location: value})}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">{t('act.modal.desc')}</label>
            <textarea 
              required
              rows={3}
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none mb-2 text-sm"
              placeholder={lang === 'zh' ? '支持插入多张图片和文字叙述' : 'Explain meetup details and plan. Supports images.'}
            />
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
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {isSubmitting ? t('act.modal.submitting') : t('act.modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

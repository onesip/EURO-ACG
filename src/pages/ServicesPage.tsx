import React, { useState, useEffect } from 'react';
import { GUEST_LIST_LIMIT, USER_LIST_LIMIT } from '../config/limits';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, limit, getDocs } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import EmbeddedMedia from '../components/EmbeddedMedia';
import { useUserProfileModal } from '../components/UserProfileModal';
import UserAvatar from '../components/UserAvatar';
import CommentCount from '../components/CommentCount';
import { ServiceAd, ServiceType } from '../types';
import { Plus, X, Camera, Sparkles, Scissors, Briefcase, Globe, Edit, Trash2, Flame, Pin } from 'lucide-react';
import { cn } from '../lib/utils';
import { isQuotaExceeded } from '../lib/quota';

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

const SERVICE_TABS: { id: ServiceType; icon: any }[] = [
  { id: 'photography', icon: Camera },
  { id: 'makeup', icon: Sparkles },
  { id: 'wig', icon: Scissors },
  { id: 'other', icon: Briefcase },
];

export default function ServicesPage() {
  const [ads, setAds] = useState<ServiceAd[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ServiceType>('photography');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<ServiceAd | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user, profile, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();

  const isAdmin = user?.email === 'zhengjiaru2018@gmail.com';

  const handleSupport = async (adId: string, currentSupports: string[] = []) => {
    if (!user) {
      alert(lang === 'zh' ? '请先登录以支持该服务！' : 'Please login to support this service!');
      return;
    }
    const adRef = doc(db, 'services', adId);
    const hasSupported = currentSupports.includes(user.uid);
 
    try {
      await updateDoc(adRef, { 
        supports: hasSupported ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Failed to support ad", err);
    }
  };

  const handlePin = async (adId: string, currentlyPinned: boolean = false) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'services', adId), {
        isPinned: !currentlyPinned
      });
    } catch (err) {
      console.error("Failed to pin service", err);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('cached_services');
    if (cached) {
      try {
        setAds(JSON.parse(cached));
      } catch (_) {}
    }
    setIsLoading(false);

    const fetchData = async () => {
      if (isQuotaExceeded()) return;
      try {
        const q = query(collection(db, 'services'), limit(user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT));
        const snapshot = await getDocs(q);
        
        const adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceAd[];
        
        // Sort: Pinned first, then by createdAt desc
        adsData.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });
        setAds(adsData);
        localStorage.setItem('cached_services', JSON.stringify(adsData));
      } catch (error: any) {
        if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded') || error?.message?.includes('Quota exceeded')) {
          setQuotaExceeded(true);
        } else {
          console.error("Services fetch error:", error);
        }
      }
    };
    fetchData();
  }, [user]);

  const filteredAds = ads.filter(ad => {
    if (ad.type !== activeTab) return false;
    if (selectedCountry !== 'ALL' && ad.country !== selectedCountry) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('srv.title')}</h1>
          <p className="text-slate-400 mt-1">{t('srv.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('srv.new')}</span>
        </button>
      </div>

      {/* Country Filtering for Services */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
          {lang === 'zh' ? '🌍 圈子过滤 / 切换服务地区' : '🌍 Circle Filters / Service Regions'}
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
            <span>{lang === 'zh' ? '全欧服务 (All)' : 'All Regions'}</span>
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

      {/* Service Type Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTab === tab.id 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                : 'bg-transparent text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(`srv.tab.${tab.id}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">{lang === 'zh' ? '正在连接产粮区...' : 'Connecting to services...'}</p>
          </div>
        ) : filteredAds.length > 0 ? (
          filteredAds.map((ad) => {
            const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === ad.country);
            return (
              <div key={ad.id} className={cn(
                "bg-[#141416] p-6 rounded-2xl border transition-all group relative",
                ad.isPinned ? "border-indigo-500/50 bg-indigo-500/[0.02]" : "border-white/5 hover:border-indigo-500/30"
              )}>
              {ad.isPinned && (
                <div className="absolute -top-2.5 -left-2.5 bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg z-10 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 fill-white" />
                  <span className="text-[10px] font-bold pr-1">{lang === 'zh' ? '置顶' : 'Pinned'}</span>
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <UserAvatar 
                    uid={ad.authorId} 
                    photoURL={ad.authorPhoto} 
                    displayName={ad.authorName} 
                    onClick={() => showProfile(ad.authorId, { displayName: ad.authorName, photoURL: ad.authorPhoto })}
                  />
                  <div className="min-w-0">
                    <p 
                      onClick={() => showProfile(ad.authorId, { displayName: ad.authorName, photoURL: ad.authorPhoto })}
                      className="text-sm font-semibold text-white hover:text-indigo-400 cursor-pointer transition-colors truncate"
                    >
                      {ad.authorName || `Provider ${ad.authorId.substring(0, 4)}`}
                    </p>
                    <p className="text-xs text-slate-400">{ad.createdAt ? new Date(ad.createdAt.toMillis()).toLocaleString() : 'Just now'}</p>
                  </div>
                </div>

                {/* Country Badge */}
                {countryInfo ? (
                  <div className="px-2 py-1 bg-white/5 border border-white/5 text-slate-300 rounded-full text-xs flex items-center gap-1 shrink-0">
                    <span>{countryInfo.flag}</span>
                    <span>{lang === 'zh' ? countryInfo.name : countryInfo.en}</span>
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-white/5 border border-white/5 text-slate-400 rounded-full text-xs flex items-center gap-1 shrink-0">
                    <span>🇪🇺</span>
                    <span>{lang === 'zh' ? '全欧洲' : 'Pan-EU'}</span>
                  </div>
                )}
              </div>

              {/* Cover & Video embedding */}
              <EmbeddedMedia 
                content={ad.content || ''} 
                coverImage={ad.coverImage} 
                videoLink={ad.videoLink} 
              />

              <div className="mb-4 mt-3">
                <PostContent content={ad.content} />
              </div>

              {/* Support & Hotness Action Bar */}
              <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-2xl my-4">
                <div className="flex items-center gap-2.5">
                  <Flame className={cn(
                    "w-5 h-5 transition-all duration-300",
                    (ad.supports?.length || 0) > 0 ? "text-amber-500 fill-amber-500/80 animate-pulse drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "text-slate-500"
                  )} />
                  <div className="text-xs">
                    <p className="font-bold text-white flex items-center gap-1">
                      {lang === 'zh' ? '人气热度' : 'Popularity'}: <span className="text-amber-400 font-extrabold font-mono">{(ad.supports?.length || 0) * 15 + 10}℃</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {ad.supports?.length || 0} {lang === 'zh' ? '人撑腰支持' : 'people supported'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSupport(ad.id, ad.supports)}
                  className={cn(
                    "px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 border",
                    user && ad.supports?.includes(user.uid)
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 border-amber-600 font-extrabold"
                      : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/5"
                  )}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{user && ad.supports?.includes(user.uid) ? (lang === 'zh' ? '已支持' : 'Supported') : (lang === 'zh' ? '点赞支持' : 'Support')}</span>
                </button>
              </div>
              
              {/* Edit/Delete Actions */}
              {(user && ad.authorId === user.uid || isAdmin) && (
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5 border-dashed">
                  {confirmDeleteId === ad.id ? (
                    <div className="flex items-center gap-1.5 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl">
                      <span className="text-[10px] text-rose-400 font-bold">{lang === 'zh' ? '确定下架？' : 'Delete?'}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'services', ad.id));
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
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handlePin(ad.id, ad.isPinned)}
                          className={cn(
                            "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm",
                            ad.isPinned 
                              ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                              : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                          )}
                        >
                          <Pin className={cn("w-3.5 h-3.5", ad.isPinned ? "fill-white" : "")} />
                          {ad.isPinned ? (lang === 'zh' ? '取消置顶' : 'Unpin') : (lang === 'zh' ? '置顶' : 'Pin')}
                        </button>
                      )}
                      {ad.authorId === user?.uid && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAd(ad);
                          }}
                          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> {lang === 'zh' ? '编辑' : 'Edit'}
                        </button>
                      )}
                      {(ad.authorId === user?.uid || isAdmin) && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(ad.id)}
                          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {isAdmin && user?.uid !== ad.authorId ? (lang === 'zh' ? '管理下架' : 'Admin Del') : (lang === 'zh' ? '下架' : 'Remove')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Reviews/Comments */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                  Reviews & Comments ({ad.commentCount ?? 0})
                </h4>
                <CommentSection parentCollection="services" parentId={ad.id} />
              </div>
            </div>
          );
        })
        ) : (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该地区暂无此分类服务，快来上架第一个服务吧！` : `No services registered in this region category yet.`}
          </div>
        )}
      </div>

      {!user && ads.length >= GUEST_LIST_LIMIT && (
        <div className="text-center py-6 mt-4 border-t border-white/5">
          <p className="text-sm text-slate-400">
            {lang === 'zh' ? '登录后查看更多内容，并加入欧洲二次元同好社区。' : 'Log in to explore more posts and connect with the Euro ACG community.'}
          </p>
        </div>
      )}

      {(isComposeOpen || editingAd) && (
        <ComposeModal 
          defaultType={activeTab} 
          editAd={editingAd || undefined}
          onClose={() => {
            setIsComposeOpen(false);
            setEditingAd(null);
          }} 
        />
      )}

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setIsComposeOpen(true)}
        className="md:hidden fixed bottom-24 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-4 rounded-full shadow-[0_8px_24px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center border border-white/10"
        title={t('srv.new')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function ComposeModal({ defaultType, editAd, onClose }: { defaultType: ServiceType, editAd?: ServiceAd, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState(editAd ? editAd.content : '');
  const [type, setType] = useState<ServiceType>(editAd ? editAd.type : defaultType);
  const [coverImage, setCoverImage] = useState(editAd?.coverImage || '');
  const [videoLink, setVideoLink] = useState(editAd?.videoLink || '');
  const [country, setCountry] = useState(editAd?.country || 'NL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEdit = !!editAd;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    if (!content.trim()) {
      setTouched(true);
      return;
    }
    setIsSubmitting(true);
    
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'services', editAd.id), {
          type,
          content,
          coverImage,
          videoLink,
          country,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'services'), {
          type,
          content,
          coverImage,
          videoLink,
          country,
          authorId: user.uid,
          authorName: profile?.displayName || 'User',
          authorPhoto: profile?.photoURL || '',
          supports: [],
          commentCount: 0,
          likeCount: 0,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to save service ad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141416] rounded-3xl shadow-2xl border border-white/10 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-none animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">
              {isEdit 
                ? (lang === 'zh' ? '✏️ 编辑服务 / Edit Service' : '✏️ Edit Service Ad') 
                : t('srv.modal.title')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {lang === 'zh' ? '服务分类' : 'Service Type'} <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as ServiceType)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-medium"
              >
                <option value="photography" className="bg-slate-900 text-white">{t('srv.tab.photography')}</option>
                <option value="makeup" className="bg-slate-900 text-white">{t('srv.tab.makeup')}</option>
                <option value="wig" className="bg-slate-900 text-white">{t('srv.tab.wig')}</option>
                <option value="other" className="bg-slate-900 text-white">{t('srv.tab.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {lang === 'zh' ? '服务所在国家' : 'Service Country'} <span className="text-rose-500 font-bold">*</span>
              </label>
              <select 
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-medium"
              >
                {EUROPEAN_COUNTRIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.flag} {lang === 'zh' ? c.name : c.en}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Cover Image Option / 自定义首图 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400">🖼️ {lang === 'zh' ? '宣传首图 / Cover Photo (展示效果加倍！)' : 'Promotion Cover Photo'}</label>
            {coverImage ? (
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/10 bg-slate-900">
                <img src={coverImage} alt="Cover Preview" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="url" 
                  placeholder={lang === 'zh' ? '输入宣传海报/作品首图 URL 网址，或右侧上传' : 'Insert Cover URL, or upload'}
                  value={coverImage}
                  onChange={e => setCoverImage(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs animate-fadeIn"
                />
                <ImageUpload 
                  onUpload={(url) => setCoverImage(url)} 
                  buttonText={lang === 'zh' ? '上传首图' : 'Upload Cover'}
                  className="shrink-0"
                />
              </div>
            )}
          </div>

          {/* Video Share link (YouTube, Bilibili, Xiaohongshu) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-400">🔗 {lang === 'zh' ? '关联作品视频/分享链接 (YouTube / Bilibili / 小红书)' : 'Embed Portfolio Video Link'}</label>
            <input 
              type="url" 
              placeholder="https://..."
              value={videoLink}
              onChange={e => setVideoLink(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {lang === 'zh' ? '服务介绍与报价详情' : 'Service Description & Rates'} <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea 
              rows={5}
              value={content}
              onBlur={() => setTouched(true)}
              onChange={e => setContent(e.target.value)}
              placeholder={t('srv.modal.desc')}
              className={cn(
                "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2 text-sm transition-colors",
                touched && !content.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
              )}
            />
            {touched && !content.trim() && (
              <p className="text-xs text-rose-400 font-semibold mb-2 animate-fadeIn">
                ⚠️ {lang === 'zh' ? '服务描述内容不能为空，请先填写内容哦！' : 'Service details are required!'}
              </p>
            )}
            <div className="flex justify-start">
              <ImageUpload onUpload={(url) => setContent(prev => prev + `\n![图片](${url})\n`)} />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 text-sm"
            >
              {isSubmitting 
                ? (lang === 'zh' ? '正在保存中...' : 'Saving...') 
                : (isEdit ? (lang === 'zh' ? '保存更改' : 'Save Changes') : t('srv.modal.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

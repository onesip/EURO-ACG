import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import EmbeddedMedia from '../components/EmbeddedMedia';
import { ServiceAd, ServiceType } from '../types';
import { Plus, X, Camera, Sparkles, Scissors, Briefcase, Globe } from 'lucide-react';
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

const SERVICE_TABS: { id: ServiceType; icon: any }[] = [
  { id: 'photography', icon: Camera },
  { id: 'makeup', icon: Sparkles },
  { id: 'wig', icon: Scissors },
  { id: 'other', icon: Briefcase },
];

export default function ServicesPage() {
  const [ads, setAds] = useState<ServiceAd[]>([]);
  const [activeTab, setActiveTab] = useState<ServiceType>('photography');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'services'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const adsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceAd[];
      setAds(adsData);
    });
    return unsubscribe;
  }, []);

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
        {filteredAds.map((ad) => {
          const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === ad.country);
          return (
            <div key={ad.id} className="bg-[#141416] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden shrink-0">
                    {ad.authorPhoto ? (
                      <img src={ad.authorPhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      ad.authorName ? ad.authorName.charAt(0) : ad.authorId.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{ad.authorName || `Provider ${ad.authorId.substring(0, 4)}`}</p>
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
              
              {/* Reviews/Comments */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Reviews & Comments</h4>
                <CommentSection parentCollection="services" parentId={ad.id} />
              </div>
            </div>
          );
        })}
        {filteredAds.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该地区暂无此分类服务，快来上架第一个服务吧！` : `No services registered in this region category yet.`}
          </div>
        )}
      </div>

      {isComposeOpen && (
        <ComposeModal 
          defaultType={activeTab} 
          onClose={() => setIsComposeOpen(false)} 
        />
      )}
    </div>
  );
}

function ComposeModal({ defaultType, onClose }: { defaultType: ServiceType, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState('');
  const [type, setType] = useState<ServiceType>(defaultType);
  const [coverImage, setCoverImage] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [country, setCountry] = useState('NL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'services'), {
        type,
        content,
        coverImage,
        videoLink,
        country,
        authorId: user.uid,
        authorName: profile?.displayName || 'User',
        authorPhoto: profile?.photoURL || '',
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to post ad');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0A0A0B]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#141416] rounded-3xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden animate-fadeIn">
        <div className="flex justify-between items-center p-5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">{t('srv.modal.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '服务分类' : 'Service Type'}</label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '服务所在国家' : 'Service Country'}</label>
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
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-xs"
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
            <textarea 
              required
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('srv.modal.desc')}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2 text-sm"
            />
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
              {isSubmitting ? t('srv.modal.submitting') : t('srv.modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

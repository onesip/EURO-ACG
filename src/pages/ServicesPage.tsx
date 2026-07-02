import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import { ServiceAd, ServiceType } from '../types';
import { Plus, X, Camera, Sparkles, Scissors, Briefcase } from 'lucide-react';

const SERVICE_TABS: { id: ServiceType; icon: any }[] = [
  { id: 'photography', icon: Camera },
  { id: 'makeup', icon: Sparkles },
  { id: 'wig', icon: Scissors },
  { id: 'other', icon: Briefcase },
];

export default function ServicesPage() {
  const [ads, setAds] = useState<ServiceAd[]>([]);
  const [activeTab, setActiveTab] = useState<ServiceType>('photography');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t } = useLanguage();

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

  const filteredAds = ads.filter(ad => ad.type === activeTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
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

      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
        {SERVICE_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'bg-indigo-500/10 text-indigo-400' 
                : 'bg-transparent text-slate-400 border border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(`srv.tab.${tab.id}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {filteredAds.map((ad) => (
          <div key={ad.id} className="bg-[#141416] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden shrink-0">
                {ad.authorPhoto ? (
                  <img src={ad.authorPhoto} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  ad.authorName ? ad.authorName.charAt(0) : ad.authorId.substring(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white truncate">{ad.authorName || `Provider ${ad.authorId.substring(0, 4)}`}</p>
                <p className="text-xs text-slate-400">{ad.createdAt ? new Date(ad.createdAt.toMillis()).toLocaleString() : 'Just now'}</p>
              </div>
            </div>
            <div className="mb-4">
              <PostContent content={ad.content} />
            </div>
            
            {/* Using CommentSection for reviews/comments */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-sm font-medium text-slate-300 mb-4">Reviews & Comments</h4>
              <CommentSection parentCollection="services" parentId={ad.id} />
            </div>
          </div>
        ))}
        {filteredAds.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            {t('srv.empty')}
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
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [type, setType] = useState<ServiceType>(defaultType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'services'), {
        type,
        content,
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
      <div className="bg-[#141416] rounded-2xl shadow-xl shadow-indigo-500/5 border border-white/10 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">{t('srv.modal.title')}</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
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
            <textarea 
              required
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('srv.modal.desc')}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2"
            />
            <div className="flex justify-start">
              <ImageUpload onUpload={(url) => setContent(prev => prev + `\n![图片](${url})\n`)} />
            </div>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="w-full py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? t('srv.modal.submitting') : t('srv.modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

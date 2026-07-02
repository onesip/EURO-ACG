import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';
import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import { Post, PostType } from '../types';
import { MessageCircle, Heart, Plus, X, AlertCircle, Lightbulb, Users, Flame, Globe, Sparkles } from 'lucide-react';
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

const POST_TABS: { id: PostType; icon: any }[] = [
  { id: 'social', icon: Users },
  { id: 'tips', icon: Lightbulb },
  { id: 'drama', icon: Flame },
  { id: 'sos', icon: AlertCircle },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeTab, setActiveTab] = useState<PostType>('social');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });
    return unsubscribe;
  }, []);

  const filteredPosts = posts.filter(p => {
    if (p.type !== activeTab) return false;
    if (activeTab === 'tips' && activeSubCategory !== 'all') {
      if (p.subCategory !== activeSubCategory) return false;
    }
    if (selectedCountry !== 'ALL') {
      return p.country === selectedCountry;
    }
    return true;
  });

  const TIPS_SUB_CATEGORIES = [
    { id: 'all', label: '全部安利' },
    { id: 'cosplay', label: '妆造/Cos' },
    { id: 'merch', label: '周边/吃土' },
    { id: 'event', label: '漫展/场照' },
    { id: 'anime', label: '番剧/游戏' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('com.title')}</h1>
          <p className="text-slate-400 mt-1">{t('com.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('com.new')}</span>
        </button>
      </div>

      {/* Country Channels / 国家频道圈子 */}
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

      {/* Forum Categorized Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {POST_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'tips') setActiveSubCategory('all');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
              activeTab === tab.id 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                : 'bg-transparent text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {t(`com.tab.${tab.id}`)}
          </button>
        ))}
      </div>

      {activeTab === 'tips' && (
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none mt-[-10px]">
          {TIPS_SUB_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSubCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeSubCategory === cat.id 
                  ? 'bg-slate-700 text-white' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4">
        {filteredPosts.map((post) => {
          const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === post.country);
          return (
            <div key={post.id} className="bg-[#141416] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden shrink-0">
                    {post.authorPhoto ? (
                      <img src={post.authorPhoto} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      post.authorName ? post.authorName.charAt(0) : post.authorId.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{post.authorName || `User ${post.authorId.substring(0, 4)}`}</p>
                    <p className="text-xs text-slate-400">{post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : 'Just now'}</p>
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
              <div className="mb-4">
                <PostContent content={post.content} />
              </div>
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-rose-400 transition-colors text-sm font-medium">
                  <Heart className="w-4 h-4" /> {t('com.like')}
                </button>
                <button className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium">
                  <MessageCircle className="w-4 h-4" /> {t('com.comment')}
                </button>
              </div>
              
              <CommentSection parentCollection="posts" parentId={post.id} />
            </div>
          );
        })}
        {filteredPosts.length === 0 && (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该国家频道或分类目前没有发言，快来发第一个贴吧！` : `No posts in this channel yet. Share your thoughts!`}
          </div>
        )}
      </div>

      {isComposeOpen && (
        <ComposeModal 
          defaultType={activeTab} 
          onClose={() => setIsComposeOpen(false)} 
        />
      )}

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setIsComposeOpen(true)}
        className="md:hidden fixed bottom-24 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-4 rounded-full shadow-[0_8px_24px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center border border-white/10"
        title={t('com.new')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function ComposeModal({ defaultType, onClose }: { defaultType: PostType, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>(defaultType);
  const [subCategory, setSubCategory] = useState<string>('cosplay');
  const [country, setCountry] = useState<string>('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'posts'), {
        type,
        ...(type === 'tips' ? { subCategory } : {}),
        content,
        country,
        authorId: user.uid,
        authorName: profile?.displayName || 'User',
        authorPhoto: profile?.photoURL || '',
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to post');
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
            <h2 className="text-lg font-bold text-white">{t('com.modal.title')}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '分类类型' : 'Post Type'}</label>
              <select 
                value={type}
                onChange={e => setType(e.target.value as PostType)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-medium"
              >
                <option value="social" className="bg-slate-900 text-white">{t('com.tab.social')}</option>
                <option value="tips" className="bg-slate-900 text-white">{t('com.tab.tips')}</option>
                <option value="drama" className="bg-slate-900 text-white">{t('com.tab.drama')}</option>
                <option value="sos" className="bg-slate-900 text-white">{t('com.tab.sos')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '所属国家圈子' : 'Circle Country'}</label>
              <select 
                value={country}
                onChange={e => setCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-medium"
              >
                <option value="ALL" className="bg-slate-900 text-white">🇪🇺 {lang === 'zh' ? '全欧洲频道' : 'Pan-European'}</option>
                {EUROPEAN_COUNTRIES.map(c => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.flag} {lang === 'zh' ? c.name : c.en}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {type === 'tips' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">安利分类</label>
              <select 
                value={subCategory}
                onChange={e => setSubCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none text-sm font-medium"
              >
                <option value="cosplay" className="bg-slate-900 text-white">妆造/Cos</option>
                <option value="merch" className="bg-slate-900 text-white">周边/吃土</option>
                <option value="event" className="bg-slate-900 text-white">漫展/场照</option>
                <option value="anime" className="bg-slate-900 text-white">番剧/游戏</option>
              </select>
            </div>
          )}

          <div>
            <textarea 
              required
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2 text-sm"
              placeholder={lang === 'zh' ? '在此处畅所欲言，支持贴图和添加链接哦' : 'Write your post here...'}
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
              {isSubmitting ? t('com.modal.submitting') : t('com.modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

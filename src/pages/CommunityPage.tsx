import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, limit, getDocs } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import { isQuotaExceeded } from '../lib/quota';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import { useUserProfileModal } from '../components/UserProfileModal';
import UserAvatar from '../components/UserAvatar';
import CommentCount from '../components/CommentCount';
import { Post, PostType } from '../types';
import { MessageCircle, Heart, Plus, X, AlertCircle, Lightbulb, Users, Flame, Globe, Sparkles, Edit, Trash2, Pin } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<PostType>('social');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { user, profile, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();

  const isAdmin = user?.email === 'zhengjiaru2018@gmail.com';

  const handleLike = async (postId: string, currentLikes: string[] = []) => {
    if (!user) {
      alert(lang === 'zh' ? '请先登录以进行贴贴！' : 'Please login to like posts!');
      return;
    }
    const postRef = doc(db, 'posts', postId);
    const hasLiked = currentLikes.includes(user.uid);
    
    try {
      await updateDoc(postRef, { 
        likes: hasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (err) {
      console.error("Failed to like post", err);
    }
  };

  const handlePin = async (postId: string, currentlyPinned: boolean = false) => {
    if (!isAdmin) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        isPinned: !currentlyPinned
      });
    } catch (err) {
      console.error("Failed to pin post", err);
    }
  };

  useEffect(() => {
    const cached = localStorage.getItem('cached_community_posts');
    if (cached) {
      try {
        setPosts(JSON.parse(cached));
      } catch (_) {}
    }
    setIsLoading(false);

    const fetchData = async () => {
      if (isQuotaExceeded()) return;
      try {
        // Remove server-side orderBy to avoid index issues and handle missing createdAt
        const q = query(collection(db, 'posts'), limit(20));
        const snapshot = await getDocs(q);
        
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];
        
        // Sort: Pinned posts first, then by createdAt desc
        const sortedPosts = [...postsData].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return bTime - aTime;
        });

        setPosts(sortedPosts);
        localStorage.setItem('cached_community_posts', JSON.stringify(sortedPosts));
      } catch (error: any) {
        if (error?.code === 'resource-exhausted' || error?.message?.includes('Quota limit exceeded') || error?.message?.includes('Quota exceeded')) {
          setQuotaExceeded(true);
        } else {
          console.error("Community posts fetch error:", error);
        }
      }
    };
    fetchData();
  }, [user]);

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
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">{lang === 'zh' ? '正在连接摸鱼广场...' : 'Connecting to square...'}</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const countryInfo = EUROPEAN_COUNTRIES.find(c => c.id === post.country);
            return (
              <div key={post.id} className={cn(
                "bg-[#141416] p-6 rounded-2xl border transition-all group relative",
                post.isPinned ? "border-indigo-500/50 bg-indigo-500/[0.02]" : "border-white/5 hover:border-indigo-500/30"
              )}>
              {post.isPinned && (
                <div className="absolute -top-2.5 -left-2.5 bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg z-10 flex items-center gap-1">
                  <Pin className="w-3.5 h-3.5 fill-white" />
                  <span className="text-[10px] font-bold pr-1">{lang === 'zh' ? '置顶' : 'Pinned'}</span>
                </div>
              )}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-start gap-3">
                  <UserAvatar 
                    uid={post.authorId} 
                    photoURL={post.authorPhoto} 
                    displayName={post.authorName} 
                    onClick={() => showProfile(post.authorId, { displayName: post.authorName, photoURL: post.authorPhoto })}
                  />
                  <div className="min-w-0">
                    <p 
                      onClick={() => showProfile(post.authorId, { displayName: post.authorName, photoURL: post.authorPhoto })}
                      className="text-sm font-semibold text-white hover:text-indigo-400 cursor-pointer transition-colors truncate"
                    >
                      {post.authorName || `User ${post.authorId.substring(0, 4)}`}
                    </p>
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
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center gap-6">
                  <button 
                    onClick={() => handleLike(post.id, post.likes)}
                    className={cn(
                      "flex items-center gap-1.5 transition-all text-sm font-medium duration-200",
                      user && post.likes?.includes(user.uid) 
                        ? "text-rose-400 hover:text-rose-500 font-semibold" 
                        : "text-slate-400 hover:text-rose-400"
                    )}
                  >
                    <Heart className={cn("w-4 h-4 transition-transform active:scale-125 duration-200", user && post.likes?.includes(user.uid) ? "fill-rose-500/80 stroke-rose-400" : "")} /> 
                    <span>{lang === 'zh' ? '贴贴' : 'Like'} ({post.likes?.length || 0})</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> {t('com.comment')} <CommentCount parentCollection="posts" parentId={post.id} />
                  </button>
                </div>

                {user && post.authorId === user.uid && (
                  <div className="flex items-center gap-3">
                    {confirmDeleteId === post.id ? (
                      <div className="flex items-center gap-2 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-[11px] text-rose-400 font-bold">{lang === 'zh' ? '确定删除该帖子吗？' : 'Delete this post?'}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'posts', post.id));
                              setConfirmDeleteId(null);
                            } catch (err) {
                              console.error(err);
                              alert('Delete failed');
                            }
                          }}
                          className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-1 rounded-lg transition-colors"
                        >
                          {lang === 'zh' ? '是的' : 'Yes'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-200 px-1.5"
                        >
                          {lang === 'zh' ? '取消' : 'Cancel'}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPost(post);
                          }}
                          className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Edit className="w-3.5 h-3.5" /> {lang === 'zh' ? '编辑' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(post.id)}
                          className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> {lang === 'zh' ? '删除' : 'Delete'}
                        </button>
                      </div>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handlePin(post.id, post.isPinned)}
                        className={cn(
                          "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm",
                          post.isPinned 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                            : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                        )}
                      >
                        <Pin className={cn("w-3.5 h-3.5", post.isPinned ? "fill-white" : "")} />
                        {post.isPinned 
                          ? (lang === 'zh' ? '取消置顶' : 'Unpin') 
                          : (lang === 'zh' ? '置顶' : 'Pin')}
                      </button>
                    )}
                  </div>
                )}
                
                {/* Admin moderation controls for non-author posts */}
                {isAdmin && user?.uid !== post.authorId && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePin(post.id, post.isPinned)}
                      className={cn(
                        "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm",
                        post.isPinned 
                          ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                          : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                      )}
                    >
                      <Pin className={cn("w-3.5 h-3.5", post.isPinned ? "fill-white" : "")} />
                      {post.isPinned 
                        ? (lang === 'zh' ? '取消置顶' : 'Unpin') 
                        : (lang === 'zh' ? '置顶' : 'Pin')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(post.id)}
                      className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1.5 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {lang === 'zh' ? '管理删除' : 'Admin Delete'}
                    </button>
                  </div>
                )}
              </div>
              
              <CommentSection parentCollection="posts" parentId={post.id} />
            </div>
          );
        })
        ) : (
          <div className="text-center py-12 text-slate-400 bg-[#141416] rounded-2xl border border-white/5">
            {lang === 'zh' ? `该国家频道或分类目前没有发言，快来发第一个贴吧！` : `No posts in this channel yet. Share your thoughts!`}
          </div>
        )}
      </div>

      {(isComposeOpen || editingPost) && (
        <ComposeModal 
          defaultType={activeTab} 
          editPost={editingPost || undefined}
          onClose={() => {
            setIsComposeOpen(false);
            setEditingPost(null);
          }} 
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

function ComposeModal({ defaultType, editPost, onClose }: { defaultType: PostType, editPost?: Post, onClose: () => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState(editPost ? editPost.content : '');
  const [type, setType] = useState<PostType>(editPost ? editPost.type : defaultType);
  const [subCategory, setSubCategory] = useState<string>(editPost?.subCategory || 'cosplay');
  const [country, setCountry] = useState<string>(editPost?.country || 'ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEdit = !!editPost;

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
        await updateDoc(doc(db, 'posts', editPost.id), {
          type,
          ...(type === 'tips' ? { subCategory } : {}),
          content,
          country,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          type,
          ...(type === 'tips' ? { subCategory } : {}),
          content,
          country,
          authorId: user.uid,
          authorName: profile?.displayName || 'User',
          authorPhoto: profile?.photoURL || '',
          likes: [],
          likeCount: 0,
          commentCount: 0,
          createdAt: serverTimestamp()
        });
      }
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
            <h2 className="text-lg font-bold text-white">
              {isEdit 
                ? (lang === 'zh' ? '✏️ 编辑帖子 / Edit Post' : '✏️ Edit Post') 
                : t('com.modal.title')}
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
                {lang === 'zh' ? '分类类型' : 'Post Type'} <span className="text-rose-500 font-bold">*</span>
              </label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">
                {lang === 'zh' ? '所属国家圈子' : 'Circle Country'} <span className="text-rose-500 font-bold">*</span>
              </label>
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
              <label className="block text-sm font-medium text-slate-400 mb-1">
                安利分类 <span className="text-rose-500 font-bold">*</span>
              </label>
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
            <label className="block text-sm font-medium text-slate-400 mb-1">
              {lang === 'zh' ? '帖子内容' : 'Post Content'} <span className="text-rose-500 font-bold">*</span>
            </label>
            <textarea 
              rows={5}
              value={content}
              onBlur={() => setTouched(true)}
              onChange={e => setContent(e.target.value)}
              className={cn(
                "w-full px-3 py-2 bg-white/5 border text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2 text-sm transition-colors",
                touched && !content.trim() ? "border-rose-500/60 focus:ring-rose-500/50" : "border-white/10"
              )}
              placeholder={lang === 'zh' ? '在此处畅所欲言，支持贴图和添加链接哦' : 'Write your post here...'}
            />
            {touched && !content.trim() && (
              <p className="text-xs text-rose-400 font-semibold mb-2 animate-fadeIn">
                ⚠️ {lang === 'zh' ? '内容不能为空，请先填写内容哦！' : 'Content is required, please fill it in!'}
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
                ? (lang === 'zh' ? '提交保存中...' : 'Saving...') 
                : (isEdit ? (lang === 'zh' ? '保存更改' : 'Save Changes') : t('com.modal.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GUEST_LIST_LIMIT, USER_LIST_LIMIT, EMERGENCY_GUEST_FIRESTORE_OFF } from '../config/limits';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, limit, getDocs, increment, runTransaction, where } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import ShareButton from '../components/ShareButton';
import { useUserProfileModal } from '../components/UserProfileModal';
import UserAvatar from '../components/UserAvatar';
import { Post, PostType } from '../types';
import { MessageCircle, Heart, Plus, X, AlertCircle, Lightbulb, Users, Flame, Globe, Sparkles, Edit, Trash2, Pin } from 'lucide-react';
import { cn } from '../lib/utils';
import { loadFromCache, saveToCache } from '../lib/cache';
import MoyuChatroom from '../components/MoyuChatroom';
import { sendNotification } from '../lib/notifications';

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
  const [viewMode, setViewMode] = useState<'posts' | 'chat'>('posts');
  const [activeSubCategory, setActiveSubCategory] = useState<string>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [indexRequired, setIndexRequired] = useState(false);
  const { user, profile, setQuotaExceeded, isQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();
  const location = useLocation();

  const isAdmin = user?.email === 'zhengjiaru2018@gmail.com';

  const handleLike = async (postId: string, currentLikes: string[] = []) => {
    if (!user) {
      alert(lang === 'zh' ? '请先登录以进行贴贴！' : 'Please login to like posts!');
      return;
    }

    const isCurrentlyLiked = currentLikes.includes(user.uid);
    const updatedLikes = isCurrentlyLiked
      ? currentLikes.filter(uid => uid !== user.uid)
      : [...currentLikes, user.uid];

    const currentPost = posts.find(p => p.id === postId);
    const updatedLikeCount = isCurrentlyLiked
      ? Math.max(0, (currentPost?.likeCount ?? 1) - 1)
      : (currentPost?.likeCount ?? 0) + 1;

    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id === postId) {
          return { ...p, likes: updatedLikes, likeCount: updatedLikeCount };
        }
        return p;
      });
      return updated;
    });

    try {
      const postRef = doc(db, 'posts', postId);
      let shouldNotify = false;
      let authorId = '';
      let postContentSnippet = '';
      
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";
        
        const postData = postDoc.data();
        authorId = postData.authorId || '';
        postContentSnippet = (postData.content || '').substring(0, 20);
        const likes = postData.likes || [];
        const isCurrentlyLikedReal = likes.includes(user.uid);

        if (isCurrentlyLikedReal) {
          transaction.update(postRef, { 
            likes: arrayRemove(user.uid),
            likeCount: increment(-1)
          });
        } else {
          transaction.update(postRef, { 
            likes: arrayUnion(user.uid),
            likeCount: increment(1)
          });
          shouldNotify = true;
        }
      });

      if (shouldNotify && authorId && authorId !== user.uid) {
        const titleZh = "💖 贴贴电波！收到同好印记！";
        const titleEn = "💖 Stamp of Love! Post liked!";
        const contentZh = `🌟 【${profile?.displayName || '神秘萌友'}】刚对你的帖子（“${postContentSnippet}...”）盖章了一个暖心的贴贴！(〃>▽<〃)/*`;
        const contentEn = `🌟 【${profile?.displayName || 'ACG Pal'}】just left a lovely stamp of approval on your post: "${postContentSnippet}..."! (〃>▽<〃)/*`;
        
        await sendNotification(
          authorId,
          user.uid,
          profile?.displayName || 'Moyu Pal',
          profile?.photoURL || '',
          'like',
          lang === 'zh' ? titleZh : titleEn,
          lang === 'zh' ? contentZh : contentEn,
          `/community?id=${postId}`
        );
      }
    } catch (err: any) {
      console.error("Failed to like post", err);
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  const handlePin = async (postId: string, currentlyPinned: boolean = false) => {
    if (!isAdmin) return;

    setPosts(prev => {
      const updated = prev.map(p => {
        if (p.id === postId) {
          return { ...p, isPinned: !currentlyPinned };
        }
        return p;
      });
      return updated;
    });

    try {
      await updateDoc(doc(db, 'posts', postId), {
        isPinned: !currentlyPinned
      });
    } catch (err: any) {
      console.error("Failed to pin post", err);
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  useEffect(() => {
    setIndexRequired(false);

    setIsLoading(true);

    const fetchData = async () => {
      const queryParams = new URLSearchParams(location.search);
      const sharedId = queryParams.get('id');

      if (!user && EMERGENCY_GUEST_FIRESTORE_OFF && !sharedId) {
        setPosts([]);
        setIsLoading(false);
        return;
      }

      try {
        const constraints: any[] = [
          where("type", "==", activeTab)
        ];

        if (activeTab === 'tips' && activeSubCategory !== 'all') {
          constraints.push(where("subCategory", "==", activeSubCategory));
        }

        if (selectedCountry !== 'ALL') {
          constraints.push(where("country", "==", selectedCountry));
        }

        // We sort in memory to avoid requiring complex composite indexes
        // constraints.push(orderBy("createdAt", "desc"));
        // Use a reasonable limit to fetch the most recent entries, then we sort and slice
        constraints.push(limit(150));

        const q = query(
          collection(db, 'posts'),
          ...constraints
        );

        const snapshot = await getDocs(q);
        setQuotaExceeded(false); // Success! Clear quota if it was set
        
        let postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];

        // Sort by createdAt desc in memory
        postsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        // Limit the posts to the required list limit
        const displayLimit = user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT;
        postsData = postsData.slice(0, displayLimit);

        if (sharedId) {
          const exists = postsData.find(a => a.id === sharedId);
          if (!exists) {
            try {
              const sharedDoc = await getDoc(doc(db, 'posts', sharedId));
              if (sharedDoc.exists()) {
                postsData.unshift({ id: sharedDoc.id, ...sharedDoc.data() } as Post);
              }
            } catch (err) {
              console.error("Failed to fetch shared post:", err);
            }
          }
        }
        
        // Sort: Pinned posts first, keeping the rest in order of createdAt desc
        const sortedPosts = [...postsData].sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0; // maintain Firestore orderBy order otherwise
        });

        setPosts(sortedPosts);
      } catch (error: any) {
        if (error?.code === 'failed-precondition') {
          setIndexRequired(true);
        } else if (error?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          console.error("Community posts fetch error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, activeTab, activeSubCategory, selectedCountry, isQuotaExceeded]);

  const filteredPosts = posts;

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
        {user && viewMode === 'posts' && (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 active:scale-95 text-white rounded-full transition-all text-xs font-bold shadow-[0_4px_12px_rgba(99,102,241,0.3)] shrink-0 border border-white/10"
          >
            <Plus className="w-4 h-4" />
            <span>{t('com.new')}</span>
          </button>
        )}
      </div>

      {!user && EMERGENCY_GUEST_FIRESTORE_OFF ? (
        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-8 text-center max-w-2xl mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white mb-4">
            {lang === 'zh' ? '🌍 社区限速保护模式' : '🌍 Community Protection Mode'}
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
          {/* View Mode Selector: Posts vs Chatroom */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 max-w-sm">
            <button
              onClick={() => setViewMode('posts')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5",
                viewMode === 'posts' 
                  ? "bg-indigo-600 text-white shadow-lg" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              📝 {lang === 'zh' ? '摸鱼论坛帖子' : 'Forums'}
            </button>
            <button
              onClick={() => setViewMode('chat')}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 relative overflow-hidden",
                viewMode === 'chat' 
                  ? "bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-lg border border-pink-500/20" 
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              💬 {lang === 'zh' ? '二次元聊天室' : 'ACG Live Chat'}
              <span className="absolute top-1 right-2 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-pink-500"></span>
              </span>
            </button>
          </div>

          {viewMode === 'chat' ? (
            <MoyuChatroom />
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
              <div className="flex justify-between items-start mb-3 gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <UserAvatar 
                    uid={post.authorId} 
                    photoURL={post.authorPhoto} 
                    displayName={post.authorName} 
                    showGender={false}
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
              <div className="flex flex-wrap justify-between items-center gap-4 mt-4 pt-4 border-t border-white/5">
                <div className="flex flex-wrap items-center gap-4">
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
                    <span>{lang === 'zh' ? '贴贴' : 'Like'} ({post.likeCount ?? 0})</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition-colors text-sm font-medium">
                    <MessageCircle className="w-4 h-4" /> {t('com.comment')} ({post.commentCount ?? 0})
                  </button>
                  <ShareButton path="community" id={post.id} title={lang === 'zh' ? '分享帖子' : 'Share post'} />
                </div>

                {user && post.authorId === user.uid && (
                  <div className="flex flex-wrap items-center gap-3">
                    {confirmDeleteId === post.id ? (
                      <div className="flex items-center gap-2 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl">
                        <span className="text-[11px] text-rose-400 font-bold">{lang === 'zh' ? '确定删除该帖子吗？' : 'Delete this post?'}</span>
                        <button
                          type="button"
                          onClick={async () => {
                            setPosts(prev => {
                              const updated = prev.filter(p => p.id !== post.id);
                              return updated;
                            });
                            setConfirmDeleteId(null);
                            try {
                              await deleteDoc(doc(db, 'posts', post.id));
                            } catch (err: any) {
                              console.error(err);
                              if (err?.code === 'resource-exhausted') {
                                setQuotaExceeded(true);
                              }
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
          <div className="text-center py-20 text-slate-400 bg-[#141416] rounded-2xl border border-white/5 flex flex-col items-center">
            {isQuotaExceeded ? (
              <>
                <AlertCircle className="w-12 h-12 mb-4 text-rose-500/50" />
                <p className="text-sm font-medium opacity-80 text-rose-400">
                  {lang === 'zh' ? '数据库暂时无法连接 (额度已耗尽)' : 'Database currently offline (Quota exceeded)'}
                </p>
                <p className="text-xs mt-2 max-w-xs mx-auto opacity-50">
                  {lang === 'zh' ? '由于今日流量过大，免费额度已用完。请等待自动恢复，或尝试点击上方重试按钮。' : 'Free quota exhausted due to high traffic. Please wait for recovery or try the retry button above.'}
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 opacity-20" />
                </div>
                <p className="max-w-xs mx-auto">
                  {lang === 'zh' ? `该国家频道或分类目前没有发言，快来发第一个贴吧！` : `No posts in this channel yet. Share your thoughts!`}
                </p>
              </>
            )}
          </div>
        )}
      </div>

            </>
          )}
        </>
      )}

      {(isComposeOpen || editingPost) && (
        <ComposeModal 
          defaultType={activeTab} 
          editPost={editingPost || undefined}
          onClose={() => {
            setIsComposeOpen(false);
            setEditingPost(null);
          }} 
          onPostCreated={(newPost) => {
            setPosts(prev => {
              const updated = [newPost, ...prev];
              return updated;
            });
          }}
          onPostUpdated={(updatedPost) => {
            setPosts(prev => {
              const updated = prev.map(p => p.id === updatedPost.id ? { ...p, ...updatedPost } : p);
              return updated;
            });
          }}
        />
      )}


    </div>
  );
}

function ComposeModal({ defaultType, editPost, onClose, onPostCreated, onPostUpdated }: { 
  defaultType: PostType, 
  editPost?: Post, 
  onClose: () => void,
  onPostCreated: (post: Post) => void,
  onPostUpdated: (post: Post) => void
}) {
  const { user, profile, setQuotaExceeded } = useAuth();
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
    
    // Generate optimistic post
    const localPost: Post = {
      id: isEdit ? editPost.id : 'local-post-' + Date.now(),
      type,
      ...(type === 'tips' ? { subCategory } : {}),
      content,
      country,
      authorId: user.uid,
      authorName: profile?.displayName || user.displayName || 'User',
      authorPhoto: profile?.photoURL || user.photoURL || '',
      likeCount: isEdit ? (editPost.likeCount ?? 0) : 0,
      commentCount: isEdit ? (editPost.commentCount ?? 0) : 0,
      createdAt: isEdit ? editPost.createdAt : { toMillis: () => Date.now(), toDate: () => new Date() } as any,
      likes: isEdit ? (editPost.likes ?? []) : [],
      isPinned: isEdit ? (editPost.isPinned ?? false) : false
    };

    if (isEdit) {
      onPostUpdated(localPost);
    } else {
      onPostCreated(localPost);
    }
    
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
          likeCount: 0,
          commentCount: 0,
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

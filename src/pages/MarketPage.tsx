import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { GUEST_LIST_LIMIT, USER_LIST_LIMIT, EMERGENCY_GUEST_FIRESTORE_OFF } from '../config/limits';
import { collection, query, orderBy, addDoc, serverTimestamp, where, doc, getDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, limit, getDocs, increment, runTransaction } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import EmbeddedMedia from '../components/EmbeddedMedia';
import ShareButton from '../components/ShareButton';
import { useUserProfileModal } from '../components/UserProfileModal';
import UserAvatar from '../components/UserAvatar';
import { Post } from '../types';
import { Plus, X, Tag, PackageSearch, Image as ImageIcon, Link2, Sparkles, Edit, Trash2, Heart, Pin, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { loadFromCache, saveToCache } from '../lib/cache';

export default function MarketPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Post | null>(null);
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
      await runTransaction(db, async (transaction) => {
        const postDoc = await transaction.get(postRef);
        if (!postDoc.exists()) throw "Post does not exist!";
        
        const postData = postDoc.data();
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
        }
      });
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
      console.error("Failed to pin market post", err);
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
          where('type', '==', 'market')
        ];

        if (selectedCountry !== 'ALL') {
          constraints.push(where('country', '==', selectedCountry));
        }

        constraints.push(orderBy('createdAt', 'desc'));
        constraints.push(limit(user ? USER_LIST_LIMIT : GUEST_LIST_LIMIT));

        const q = query(
          collection(db, 'posts'), 
          ...constraints
        );

        const snapshot = await getDocs(q);
        setQuotaExceeded(false); // Success! Clear quota if it was set
        
        const postsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Post[];

        if (sharedId) {
          const exists = postsData.find(a => a.id === sharedId);
          if (!exists) {
            try {
              const sharedDoc = await getDoc(doc(db, 'posts', sharedId));
              if (sharedDoc.exists()) {
                postsData.unshift({ id: sharedDoc.id, ...sharedDoc.data() } as Post);
              }
            } catch (err) {
              console.error("Failed to fetch shared market post:", err);
            }
          }
        }
        
        // Sort: Pinned first, keeping rest in order of createdAt desc
        postsData.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return 0; // maintain Firestore orderBy order otherwise
        });
        setPosts(postsData);
      } catch (error: any) {
        if (error?.code === 'failed-precondition') {
          setIndexRequired(true);
        } else if (error?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          console.error("Market posts fetch error:", error);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user, selectedCountry, isQuotaExceeded]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('mkt.title')}</h1>
          <p className="text-slate-400 mt-1">{t('mkt.subtitle')}</p>
        </div>
        {user && (
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('mkt.new')}</span>
          </button>
        )}
      </div>

      {!user && EMERGENCY_GUEST_FIRESTORE_OFF ? (
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
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 text-amber-400 flex items-center gap-3 col-span-full">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">
            {lang === 'zh' 
              ? '需要创建 Firestore 复合索引以支持当前筛选。请在 Firebase 控制台创建对应的 Index。' 
              : 'Firestore composite index is required for this query. Please create it in your Firebase Console.'}
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 animate-pulse col-span-full">
            <Sparkles className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-sm font-medium">{lang === 'zh' ? '正在连接集市...' : 'Connecting to market...'}</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <div key={post.id} className={cn(
              "bg-[#141416] p-6 rounded-2xl border transition-all flex flex-col h-full group relative",
              post.isPinned ? "border-indigo-500/50 bg-indigo-500/[0.02]" : "border-white/5 hover:border-indigo-500/30"
            )}>
            {post.isPinned && (
              <div className="absolute -top-2.5 -left-2.5 bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg z-10 flex items-center gap-1">
                <Pin className="w-3.5 h-3.5 fill-white" />
                <span className="text-[10px] font-bold pr-1">{lang === 'zh' ? '置顶' : 'Pinned'}</span>
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-md text-xs font-semibold">
                <Tag className="w-3 h-3" />
                MARKET
              </div>
              <p className="text-xs text-slate-400">{post.createdAt ? new Date(post.createdAt.toMillis()).toLocaleString() : 'Just now'}</p>
            </div>
            
            {/* Embedded custom cover and videos */}
            <EmbeddedMedia 
              content={post.content || ''} 
              coverImage={post.coverImage} 
              videoLink={post.videoLink} 
            />

            <div className="flex-1 mb-4 mt-3">
              <PostContent content={post.content} />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
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
                  <span>{lang === 'zh' ? '贴贴' : 'Like'} ({post.likeCount ?? 0})</span>
                </button>
                <div className="flex items-center gap-2">
                  <UserAvatar 
                    uid={post.authorId} 
                    photoURL={post.authorPhoto} 
                    displayName={post.authorName} 
                    size="sm"
                    showGender={false}
                    onClick={() => showProfile(post.authorId, { displayName: post.authorName, photoURL: post.authorPhoto })}
                  />
                  <button 
                    onClick={() => showProfile(post.authorId, { displayName: post.authorName, photoURL: post.authorPhoto })}
                    className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {t('mkt.contact')} ({post.commentCount ?? 0})
                  </button>
                  <ShareButton path="market" id={post.id} title={post.title || (lang === 'zh' ? '分享二手物品' : 'Share Market Item')} />
                </div>
              </div>
            </div>

            {(user && post.authorId === user.uid || isAdmin) && (
              <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-white/5 border-dashed">
                {confirmDeleteId === post.id ? (
                  <div className="flex items-center gap-1.5 animate-fadeIn bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded-xl">
                    <span className="text-[10px] text-rose-400 font-bold">{lang === 'zh' ? '确定下架？' : 'Delete?'}</span>
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
                        onClick={() => handlePin(post.id, post.isPinned)}
                        className={cn(
                          "flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl transition-all shadow-sm",
                          post.isPinned 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                            : "bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                        )}
                      >
                        <Pin className={cn("w-3.5 h-3.5", post.isPinned ? "fill-white" : "")} />
                        {post.isPinned ? (lang === 'zh' ? '取消置顶' : 'Unpin') : (lang === 'zh' ? '置顶' : 'Pin')}
                      </button>
                    )}
                    {post.authorId === user?.uid && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(post);
                        }}
                        className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/5 hover:bg-indigo-500/10 px-2.5 py-1.5 rounded-xl transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> {lang === 'zh' ? '编辑' : 'Edit'}
                      </button>
                    )}
                    {(post.authorId === user?.uid || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(post.id)}
                        className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-bold bg-rose-500/5 hover:bg-rose-500/10 px-2.5 py-1.5 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {isAdmin && user?.uid !== post.authorId ? (lang === 'zh' ? '管理下架' : 'Admin Del') : (lang === 'zh' ? '下架' : 'Remove')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-auto">
              <CommentSection parentCollection="posts" parentId={post.id} />
            </div>
          </div>
        ))
        ) : (
          <div className="col-span-full text-center py-20 text-slate-400 bg-[#141416] rounded-2xl border border-white/5 flex flex-col items-center">
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
                <PackageSearch className="w-12 h-12 text-slate-300 mb-3 opacity-20" />
                <p>{t('mkt.empty')}</p>
              </>
            )}
          </div>
        )}
      </div>

        </>
      )}

      {(isComposeOpen || editingItem) && (
        <ComposeMarketModal 
          editItem={editingItem || undefined}
          onClose={() => {
            setIsComposeOpen(false);
            setEditingItem(null);
          }} 
          onItemCreated={(newItem) => {
            setPosts(prev => {
              const updated = [newItem, ...prev];
              return updated;
            });
          }}
          onItemUpdated={(updatedItem) => {
            setPosts(prev => {
              const updated = prev.map(p => p.id === updatedItem.id ? { ...p, ...updatedItem } : p);
              return updated;
            });
          }}
        />
      )}

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => setIsComposeOpen(true)}
        className="md:hidden fixed bottom-24 right-5 z-40 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white p-4 rounded-full shadow-[0_8px_24px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center border border-white/10"
        title={t('mkt.new')}
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function ComposeMarketModal({ editItem, onClose, onItemCreated, onItemUpdated }: { 
  editItem?: Post, 
  onClose: () => void,
  onItemCreated: (item: Post) => void,
  onItemUpdated: (item: Post) => void
}) {
  const { user, profile, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState(editItem ? editItem.content : '');
  const [coverImage, setCoverImage] = useState(editItem?.coverImage || '');
  const [videoLink, setVideoLink] = useState(editItem?.videoLink || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState(false);

  const isEdit = !!editItem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    if (!content.trim()) {
      setTouched(true);
      return;
    }
    setIsSubmitting(true);
    
    // Generate optimistic item
    const localItem: Post = {
      id: isEdit ? editItem.id : 'local-market-' + Date.now(),
      type: 'market',
      content,
      coverImage,
      videoLink,
      authorId: user.uid,
      authorName: profile?.displayName || user.displayName || 'User',
      authorPhoto: profile?.photoURL || user.photoURL || '',
      likes: isEdit ? (editItem.likes ?? []) : [],
      likeCount: isEdit ? (editItem.likeCount ?? 0) : 0,
      commentCount: isEdit ? (editItem.commentCount ?? 0) : 0,
      createdAt: isEdit ? editItem.createdAt : { toMillis: () => Date.now(), toDate: () => new Date() } as any,
      isPinned: isEdit ? (editItem.isPinned ?? false) : false
    };

    if (isEdit) {
      onItemUpdated(localItem);
    } else {
      onItemCreated(localItem);
    }

    try {
      if (isEdit) {
        await updateDoc(doc(db, 'posts', editItem.id), {
          content,
          coverImage,
          videoLink,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'posts'), {
          type: 'market',
          content,
          coverImage,
          videoLink,
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
                ? (lang === 'zh' ? '✏️ 编辑宝贝 / Edit Item' : '✏️ Edit Item') 
                : t('mkt.modal.title')}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Custom Cover Image Option / 自定义首图 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-400">🖼️ {lang === 'zh' ? '自定义宝贝首图 / Cover Photo' : 'Custom Cover Image'}</label>
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
                  placeholder={lang === 'zh' ? '输入任意图片 URL 网址，或点击右侧上传' : 'Insert Cover Image URL, or upload'}
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

          {/* Video / Video Link (YouTube, Bilibili, Xiaohongshu) */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-400">🔗 {lang === 'zh' ? '关联视频/分享链接 (YouTube / Bilibili / 小红书)' : 'Embed Video/Social Link'}</label>
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
              {lang === 'zh' ? '宝贝描述' : 'Item Description'} <span className="text-rose-500 font-bold">*</span>
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
              placeholder={t('mkt.modal.desc')}
            />
            {touched && !content.trim() && (
              <p className="text-xs text-rose-400 font-semibold mb-2 animate-fadeIn">
                ⚠️ {lang === 'zh' ? '描述内容不能为空哦！' : 'Description is required!'}
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
                ? (lang === 'zh' ? '保存中...' : 'Saving...') 
                : (isEdit ? (lang === 'zh' ? '保存更改' : 'Save Changes') : t('mkt.modal.submit'))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

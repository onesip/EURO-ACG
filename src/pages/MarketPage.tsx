import React, { useState, useEffect } from 'react';
import { collection, query, addDoc, serverTimestamp, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { useLanguage } from '../components/LanguageProvider';
import CommentSection from '../components/CommentSection';
import PostContent from '../components/PostContent';
import ImageUpload from '../components/ImageUpload';
import EmbeddedMedia from '../components/EmbeddedMedia';
import { Post } from '../types';
import { Plus, X, Tag, PackageSearch, Image as ImageIcon, Link2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';

export default function MarketPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const q = query(
      collection(db, 'posts'), 
      where('type', '==', 'market')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      
      // Sort locally descending
      postsData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis() || 0;
        const bTime = b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });
      setPosts(postsData);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{t('mkt.title')}</h1>
          <p className="text-slate-400 mt-1">{t('mkt.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsComposeOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">{t('mkt.new')}</span>
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((post) => (
          <div key={post.id} className="bg-[#141416] p-6 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all flex flex-col h-full group">
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
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-[10px] font-bold overflow-hidden shrink-0">
                  {post.authorPhoto ? (
                    <img src={post.authorPhoto} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    post.authorName ? post.authorName.charAt(0) : post.authorId.substring(0, 2).toUpperCase()
                  )}
                </div>
                <span className="text-xs font-medium text-slate-400 truncate max-w-[120px]">{post.authorName || t('mkt.seller')}</span>
              </div>
              <button className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                {t('mkt.contact')}
              </button>
            </div>
            <div className="mt-auto">
              <CommentSection parentCollection="posts" parentId={post.id} />
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-400 flex flex-col items-center">
            <PackageSearch className="w-12 h-12 text-slate-300 mb-3" />
            <p>{t('mkt.empty')}</p>
          </div>
        )}
      </div>

      {isComposeOpen && (
        <ComposeMarketModal onClose={() => setIsComposeOpen(false)} />
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

function ComposeMarketModal({ onClose }: { onClose: () => void }) {
  const { user, profile } = useAuth();
  const { t, lang } = useLanguage();
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [videoLink, setVideoLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Must be logged in');
    setIsSubmitting(true);
    
    try {
      await addDoc(collection(db, 'posts'), {
        type: 'market',
        content,
        coverImage,
        videoLink,
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
            <h2 className="text-lg font-bold text-white">{t('mkt.modal.title')}</h2>
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
            <label className="block text-sm font-medium text-slate-400 mb-1">{lang === 'zh' ? '宝贝描述' : 'Item Description'}</label>
            <textarea 
              required
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none placeholder-slate-500 mb-2 text-sm"
              placeholder={t('mkt.modal.desc')}
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
              {isSubmitting ? t('mkt.modal.submitting') : t('mkt.modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, serverTimestamp, getDocs, increment, doc, runTransaction, limit, getDoc } from 'firebase/firestore';
// import { onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { useUserProfileModal } from './UserProfileModal';
import { isQuotaExceeded } from '../lib/quota';
import { COMMENT_PAGE_LIMIT } from '../config/limits';
import { Send, MessageCircle } from 'lucide-react';
import { sendNotification } from '../lib/notifications';

export default function CommentSection({ parentCollection, parentId }: { parentCollection: 'activities' | 'posts' | 'services', parentId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const { user, profile, setQuotaExceeded } = useAuth();
  const { t, lang } = useLanguage();
  const { showProfile } = useUserProfileModal();

  useEffect(() => {
    if (!user) {
      setComments([]);
      return;
    }

    const fetchData = async () => {
      if (isQuotaExceeded()) return;
      try {
        const q = query(collection(db, parentCollection, parentId, 'comments'), orderBy('createdAt', 'desc'), limit(COMMENT_PAGE_LIMIT));
        const snapshot = await getDocs(q);
        setQuotaExceeded(false); // Success! Clear quota
        
        const commentsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        })).sort((a: any, b: any) => {
          const aTime = a.createdAt?.toMillis() || 0;
          const bTime = b.createdAt?.toMillis() || 0;
          return aTime - bTime;
        });
        setComments(commentsData);
      } catch (error: any) {
        if (error?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          console.error("Comment fetch error:", error);
        }
      }
    };
    fetchData();
  }, [parentCollection, parentId, isQuotaExceeded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    
    const commentText = content.trim();
    setContent('');

    // Generate optimistic local comment
    const tempComment = {
      id: 'local-comment-' + Date.now(),
      content: commentText,
      authorId: user.uid,
      authorName: profile?.displayName || user.displayName || 'User',
      authorPhoto: profile?.photoURL || user.photoURL || '',
      createdAt: { toMillis: () => Date.now(), toDate: () => new Date() } as any
    };

    // Update local state instantly
    setComments(prev => {
      const updated = [...prev, tempComment];
      return updated;
    });

    try {
      const parentDocRef = doc(db, parentCollection, parentId);
      const newCommentRef = doc(collection(db, parentCollection, parentId, 'comments'));
      
      let parentAuthorId = '';
      try {
        const parentDocSnap = await getDoc(parentDocRef);
        if (parentDocSnap.exists()) {
          const pData = parentDocSnap.data();
          parentAuthorId = pData.authorId || pData.creatorId || '';
        }
      } catch (getErr) {
        console.warn("Failed to fetch parent author details:", getErr);
      }

      await runTransaction(db, async (transaction) => {
        transaction.set(newCommentRef, {
          content: commentText,
          authorId: user.uid,
          authorName: profile?.displayName || 'User',
          authorPhoto: profile?.photoURL || '',
          createdAt: serverTimestamp()
        });
        transaction.update(parentDocRef, {
          commentCount: increment(1)
        });
      });

      if (parentAuthorId && parentAuthorId !== user.uid) {
        const titleZh = "💬 吐槽电波！收到同好回复！";
        const titleEn = "💬 New Retort! Someone replied!";
        const snippet = commentText.substring(0, 25);
        const contentZh = `💬 【${profile?.displayName || '神秘萌友'}】在你的帖子下发表了新的吐槽：“${snippet}...” (*≧▽≦) 快去看看吧！`;
        const contentEn = `💬 【${profile?.displayName || 'ACG Pal'}】commented on your post: "${snippet}..." (*≧▽≦) Go check it out!`;
        
        await sendNotification(
          parentAuthorId,
          user.uid,
          profile?.displayName || 'Moyu Pal',
          profile?.photoURL || '',
          'comment',
          lang === 'zh' ? titleZh : titleEn,
          lang === 'zh' ? contentZh : contentEn,
          `/community?id=${parentId}`
        );
      }
    } catch (error: any) {
      console.error("Firestore comment failed:", error);
      if (error?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      }
    }
  };

  const [isDanmaku, setIsDanmaku] = useState(true);

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      {/* Header with Count and Danmaku Toggle */}
      <div className="flex justify-between items-center mb-2 px-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="text-xs font-bold uppercase tracking-wider">
            {t('com.comment')} ({comments.length})
          </span>
        </div>
        <button 
          onClick={() => setIsDanmaku(!isDanmaku)}
          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition-all border ${isDanmaku ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-white/5 text-slate-500 border-white/5'}`}
        >
          {isDanmaku ? (lang === 'zh' ? '弹幕：开' : 'Danmaku: On') : (lang === 'zh' ? '弹幕：关' : 'Danmaku: Off')}
        </button>
      </div>

      {/* Comments List */}
      {comments.length > 0 && (
        <>
          {isDanmaku ? (
            <div className="relative h-40 overflow-hidden bg-slate-900/50 rounded-xl border border-white/5">
              <style>{`
                @keyframes danmaku-slide {
                  0% { transform: translateX(100%); }
                  100% { transform: translateX(-300%); }
                }
              `}</style>
              {comments.map((comment, i) => (
                <div 
                  key={comment.id} 
                  className="absolute whitespace-nowrap flex items-center gap-2 px-3 py-1.5 bg-black/40 rounded-full backdrop-blur-md border border-white/10"
                  style={{
                    top: `${(i % 5) * 20 + 5}%`,
                    animation: `danmaku-slide ${8 + (i % 5)}s linear infinite`,
                    animationDelay: `${(i % 3) * 1.5}s`,
                    right: '-100%',
                    zIndex: 10
                  }}
                >
                  <div 
                    onClick={() => showProfile(comment.authorId, { displayName: comment.authorName, photoURL: comment.authorPhoto })}
                    className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                    title={comment.authorName}
                  >
                    {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-700 text-[10px] flex items-center justify-center text-white">{comment.authorName?.charAt(0) || 'U'}</div>}
                  </div>
                  <span className="text-sm font-medium text-white shadow-sm">{comment.content}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <div 
                    onClick={() => showProfile(comment.authorId, { displayName: comment.authorName, photoURL: comment.authorPhoto })}
                    className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden cursor-pointer hover:scale-105 active:scale-95 transition-transform shadow-[0_0_8px_rgba(99,102,241,0.1)] border border-transparent hover:border-indigo-500/50"
                  >
                      {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : comment.authorName?.charAt(0) || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-2 inline-block max-w-full">
                      <p 
                        onClick={() => showProfile(comment.authorId, { displayName: comment.authorName, photoURL: comment.authorPhoto })}
                        className="text-xs font-medium text-slate-300 hover:text-indigo-400 cursor-pointer transition-colors mb-0.5 truncate"
                      >
                        {comment.authorName}
                      </p>
                      <p className="text-sm text-slate-200 break-words whitespace-pre-wrap">{comment.content}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 ml-2">
                      {comment.createdAt ? new Date(comment.createdAt.toMillis()).toLocaleString() : 'Just now'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-2 relative">
          <input
            type="text"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={t('comment.placeholder')}
            className="flex-1 bg-white/5 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:border-indigo-500/50"
          />
          <button type="submit" disabled={!content.trim()} className="absolute right-1 top-1 p-1.5 text-indigo-400 hover:text-indigo-300 disabled:opacity-50 disabled:hover:text-indigo-400">
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <p className="text-xs text-slate-500 text-center py-2">{t('comment.loginToComment')}</p>
      )}
    </div>
  );
}

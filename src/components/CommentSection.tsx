import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { Send } from 'lucide-react';

export default function CommentSection({ parentCollection, parentId }: { parentCollection: 'activities' | 'posts' | 'services', parentId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const { user, profile } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    const q = query(collection(db, parentCollection, parentId, 'comments'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [parentCollection, parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    try {
      await addDoc(collection(db, parentCollection, parentId, 'comments'), {
        content: content.trim(),
        authorId: user.uid,
        authorName: profile?.displayName || 'User',
        authorPhoto: profile?.photoURL || '',
        createdAt: serverTimestamp()
      });
      setContent('');
    } catch (error) {
      console.error(error);
    }
  };

  const [isDanmaku, setIsDanmaku] = useState(true);

  return (
    <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
      {/* Danmaku Toggle */}
      <div className="flex justify-end mb-2">
        <button 
          onClick={() => setIsDanmaku(!isDanmaku)}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${isDanmaku ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-slate-400'}`}
        >
          {isDanmaku ? '弹幕模式：开' : '弹幕模式：关'}
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
                  <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0">
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
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center text-xs font-bold text-slate-400 overflow-hidden">
                      {comment.authorPhoto ? <img src={comment.authorPhoto} className="w-full h-full object-cover" /> : comment.authorName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <div className="bg-white/5 rounded-2xl rounded-tl-none px-4 py-2">
                      <p className="text-xs font-medium text-slate-300 mb-0.5">{comment.authorName}</p>
                      <p className="text-sm text-slate-200">{comment.content}</p>
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

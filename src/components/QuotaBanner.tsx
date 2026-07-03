import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { clearQuota } from '../lib/quota';
import { collection, query, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function QuotaBanner() {
  const { isQuotaExceeded, setQuotaExceeded } = useAuth();
  const { lang } = useLanguage();
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (!isQuotaExceeded) return null;

  const handleRetry = async () => {
    setIsRetrying(true);
    setRetryError(null);
    
    try {
      // Attempt a small probe query
      const q = query(collection(db, 'posts'), limit(1));
      await getDocs(q);
      
      // If we reach here, it worked!
      clearQuota();
      setQuotaExceeded(false);
      
      // Clear cache flags
      localStorage.removeItem('cached_community_posts');
      localStorage.removeItem('cached_activities');
      localStorage.removeItem('cached_market_posts');
      localStorage.removeItem('cached_services');
      
      // Full reload to ensure fresh data
      window.location.href = window.location.origin + window.location.pathname;
    } catch (err: any) {
      console.error("Retry probe failed:", err.code);
      if (err?.code === 'resource-exhausted') {
        setRetryError(lang === 'zh' ? '数据库尚未完成升级同步，请再等待几分钟后重试。' : 'Database upgrade sync not yet completed, please try again in a few minutes.');
      } else {
        setRetryError(lang === 'zh' ? '连接尝试失败，请检查网络或稍后刷新。' : 'Connection failed. Please check your network or refresh later.');
      }
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 mb-6 animate-fadeIn">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-rose-400 font-bold">
            {lang === 'zh' ? '访问暂时受限' : 'Access Temporarily Restricted'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'zh' 
              ? '您的访问暂时受限。如果您刚刚升级了 Blaze 计划，Google 服务器通常需要 5-15 分钟来同步账单状态到数据库，请耐心等待。系统已开启深度缓存模式，大幅降低您的云端花费，帮您省钱！' 
              : 'Access is temporarily restricted. If you just upgraded to the Blaze plan, please wait 5-15 minutes for Google servers to sync your billing status. Aggressive caching is enabled to minimize your costs!'}
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-rose-900/20"
            >
              {isRetrying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {isRetrying 
                ? (lang === 'zh' ? '正在尝试连接...' : 'Attempting to connect...') 
                : (lang === 'zh' ? '立即强制重试' : 'Force Retry Now')}
            </button>
            <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-500 flex items-center">
              {lang === 'zh' ? '状态：受限中' : 'Status: Restricted'}
            </div>
          </div>
          {retryError && (
            <p className="mt-3 text-xs text-rose-400 font-medium animate-fadeIn">
              ⚠️ {retryError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

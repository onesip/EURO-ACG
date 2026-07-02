import React from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { clearQuota } from '../lib/quota';

export default function QuotaBanner() {
  const { isQuotaExceeded, setQuotaExceeded } = useAuth();
  const { lang } = useLanguage();

  if (!isQuotaExceeded) return null;

  const handleRetry = () => {
    clearQuota();
    setQuotaExceeded(false);
    window.location.reload();
  };

  return (
    <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-6 mb-6 animate-fadeIn">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-rose-400 font-bold">
            {lang === 'zh' ? '数据库访问额度已用完' : 'Database Quota Exceeded'}
          </h3>
          <p className="text-sm text-slate-400 mt-1">
            {lang === 'zh' 
              ? '由于今天访问量过大，Firebase 免费额度已耗尽。系统已进入 5 分钟自动保护模式，请稍后再试，或点击下方按钮重试。' 
              : 'Firebase free quota has been exhausted due to high traffic today. 5-minute protection mode enabled. Please try again later or click the button below.'}
          </p>
          <button
            onClick={handleRetry}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-rose-900/20"
          >
            <RefreshCw className="w-4 h-4" />
            {lang === 'zh' ? '立即重试 / 刷新页面' : 'Retry / Reload Page'}
          </button>
        </div>
      </div>
    </div>
  );
}

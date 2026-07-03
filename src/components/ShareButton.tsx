import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { useLanguage } from './LanguageProvider';

interface ShareButtonProps {
  path: string;
  id: string;
  title: string;
}

export default function ShareButton({ path, id, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { lang } = useLanguage();

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#/${path}?id=${id}`;
    
    if (navigator.share) {
      navigator.share({
        title: title,
        url: shareUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <button
      onClick={handleShare}
      title={lang === 'zh' ? '分享' : 'Share'}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 text-xs font-medium"
    >
      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
      <span className="hidden sm:inline">
        {copied ? (lang === 'zh' ? '已复制' : 'Copied!') : (lang === 'zh' ? '分享' : 'Share')}
      </span>
    </button>
  );
}

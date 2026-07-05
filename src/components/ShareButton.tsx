import React, { useState } from 'react';
import { Share2, Check, X, Copy, ExternalLink, Sparkles, Send } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import { motion, AnimatePresence } from 'motion/react';

interface ShareButtonProps {
  path: string;
  id: string;
  title: string;
  type?: 'activity' | 'post' | 'market' | 'service';
  dateTime?: string;
  location?: string;
  authorName?: string;
}

export default function ShareButton({ 
  path, 
  id, 
  title, 
  type = 'activity',
  dateTime,
  location,
  authorName
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlogan, setCopiedSlogan] = useState(false);
  const { lang } = useLanguage();

  const shareUrl = `${window.location.origin}${window.location.pathname}#/${path}?id=${id}`;

  // Generate exquisite themed sharing slogan with custom emojis & memes matching user requests
  let shareText = '';
  if (type === 'activity') {
    shareText = `【欧洲二次元同好集结 🌍】\n✨ 团咪开团我秒跟！大家速来上车！\n\n🎯 行动：${title}\n📅 时间：${dateTime || '待议 (TBD)'}\n📍 地点：${location || '待议 (TBD)'}\n👤 主办：${authorName || '次元居民'}\n\n立即加入/一秒面基 👇\n${shareUrl}`;
  } else if (type === 'post') {
    const preview = title.length > 80 ? `${title.substring(0, 80)}...` : title;
    shareText = `【次元摸鱼圈 🌟】\n🔥 我嘞个惊为天人！快来看这个神仙帖子！\n\n📝 内容：\n"${preview}"\n\n👤 作者：${authorName || '神秘萌友'}\n\n传送门一秒直达 👇\n${shareUrl}`;
  } else if (type === 'market') {
    const preview = title.length > 80 ? `${title.substring(0, 80)}...` : title;
    shareText = `【次元闲置集市 🎒】\n🔥 我嘞个惊为天人！又有绝版好物上架了！\n\n📦 物品：${preview}\n👤 卖家：${authorName || '次元同好'}\n\n赶紧来淘好物 👇\n${shareUrl}`;
  } else if (type === 'service') {
    const preview = title.length > 80 ? `${title.substring(0, 80)}...` : title;
    shareText = `【次元手艺人专区 ✂️】\n✨ 我嘞个惊为天人！发现了超级赞的妆娘/摄影/后期！\n\n🛠️ 服务：${preview}\n👤 手艺人：${authorName || '次元手艺人'}\n\n点击预约/查看作品 👇\n${shareUrl}`;
  } else {
    shareText = `【EuroACG 二次元同好会 🌍】\n✨ 发现了宝藏，速来围观！\n\n📌 标题：《${title}》\n\n查看详情👇\n${shareUrl}`;
  }

  const handleOpenShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(true);
  };

  const copyToClipboard = (text: string, type: 'link' | 'slogan') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'link') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      } else {
        setCopiedSlogan(true);
        setTimeout(() => setCopiedSlogan(false), 2000);
      }
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: type === 'activity' ? `团咪开团我秒跟：${title}` : `我嘞个惊为天人：${title}`,
        text: shareText,
        url: shareUrl
      }).catch(console.error);
    }
  };

  return (
    <>
      <button
        onClick={handleOpenShare}
        title={lang === 'zh' ? '分享传送阵' : 'Share Teleport'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 text-xs font-semibold border border-transparent hover:border-indigo-500/20 shadow-sm"
      >
        <Share2 className="w-3.5 h-3.5 animate-pulse" />
        <span className="hidden sm:inline">
          {lang === 'zh' ? '分享' : 'Share'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div 
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 backdrop-blur-md bg-black/85"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-md bg-[#141416] border border-indigo-500/30 rounded-3xl p-5 shadow-[0_0_50px_rgba(99,102,241,0.2)] flex flex-col gap-4 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              {/* Top Banner Accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all border border-white/5 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2.5 mt-1.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    {lang === 'zh' ? '次元分享传送阵' : 'Teleport Portal'}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {lang === 'zh' ? '已为您生成精致分享文案，可直接分享至微群、朋友圈！' : 'Optimized copy templates ready for instant sharing.'}
                  </p>
                </div>
              </div>

              {/* Preview Text Box */}
              <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-4 relative group">
                <div className="absolute top-2.5 right-2.5 text-[8px] font-black uppercase tracking-widest text-indigo-500/60 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10">
                  {lang === 'zh' ? '预览 (Preview)' : 'Preview'}
                </div>
                <pre className="text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-all max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                  {shareText}
                </pre>
              </div>

              {/* Copy Actions */}
              <div className="flex flex-col gap-2">
                {/* 1. Copy Slogan Button */}
                <button
                  type="button"
                  onClick={() => copyToClipboard(shareText, 'slogan')}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md cursor-pointer group"
                >
                  {copiedSlogan ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300 animate-bounce" />
                      <span>{lang === 'zh' ? '✨ 精美分享语已复制！速去粘贴！' : 'Slogan Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                      <span>{lang === 'zh' ? '复制精美分享语 (微群专享 🚀)' : 'Copy Slogan (For WeChat)'}</span>
                    </>
                  )}
                </button>

                {/* 2. Secondary Row */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Copy Link */}
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shareUrl, 'link')}
                    className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all border border-white/5 active:scale-95 cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{lang === 'zh' ? '链接已复制' : 'Link Copied'}</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{lang === 'zh' ? '仅复制专属链接' : 'Copy Link Only'}</span>
                      </>
                    )}
                  </button>

                  {/* System native share */}
                  <button
                    type="button"
                    onClick={handleNativeShare}
                    disabled={!navigator.share}
                    className="py-2.5 px-3 bg-[#141416] hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-400 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all border border-white/5 hover:border-indigo-500/20 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-300 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{lang === 'zh' ? '系统原生分享' : 'Native Share'}</span>
                  </button>
                </div>
              </div>

              {/* Aesthetic Footer Branding */}
              <div className="text-center text-[8px] font-black tracking-widest text-slate-600 border-t border-white/5 pt-3 uppercase">
                EUROACG MEMBER PORTAL SYSTEM
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

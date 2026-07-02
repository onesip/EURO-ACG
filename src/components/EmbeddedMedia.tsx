import React from 'react';
import { Youtube, Tv, Share2, Image as ImageIcon } from 'lucide-react';

interface EmbeddedMediaProps {
  content: string;
  coverImage?: string;
  videoLink?: string;
}

export default function EmbeddedMedia({ content, coverImage, videoLink }: EmbeddedMediaProps) {
  // Regex to extract video IDs
  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const getBilibiliBvid = (url: string) => {
    const regExp = /(BV[a-zA-Z0-9]{10})/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const getXiaohongshuId = (url: string) => {
    return url.includes('xiaohongshu.com') || url.includes('xhslink.com');
  };

  // 1. Check explicit video link first, then check inside content string
  let youtubeId = videoLink ? getYoutubeId(videoLink) : null;
  let bilibiliBvid = videoLink ? getBilibiliBvid(videoLink) : null;
  let isXiaohongshu = videoLink ? getXiaohongshuId(videoLink) : false;

  if (!youtubeId && !bilibiliBvid && !isXiaohongshu && content) {
    // Scan content for links
    const urls = content.match(/https?:\/\/[^\s]+/g) || [];
    for (const url of urls) {
      if (!youtubeId) youtubeId = getYoutubeId(url);
      if (!bilibiliBvid) bilibiliBvid = getBilibiliBvid(url);
      if (!isXiaohongshu) isXiaohongshu = getXiaohongshuId(url);
    }
  }

  return (
    <div className="space-y-3 mt-3">
      {/* 1. Custom Cover Image (首图) */}
      {coverImage && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/5 bg-slate-900 shadow-md">
          <img 
            src={coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] text-white flex items-center gap-1">
            <ImageIcon className="w-3 h-3 text-pink-400" />
            <span>首图 Cover</span>
          </div>
        </div>
      )}

      {/* 2. Youtube Embedded Player */}
      {youtubeId && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/5 bg-black shadow-lg">
          <iframe
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title="YouTube Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute top-3 left-3 px-2 py-1 bg-rose-600 rounded-lg text-[10px] text-white flex items-center gap-1 font-bold">
            <Youtube className="w-3 h-3" />
            <span>YouTube</span>
          </div>
        </div>
      )}

      {/* 3. Bilibili Embedded Player */}
      {bilibiliBvid && (
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-white/5 bg-black shadow-lg">
          <iframe
            src={`https://player.bilibili.com/player.html?bvid=${bilibiliBvid}&page=1&high_quality=1&as_wide=1`}
            title="Bilibili Video Player"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 w-full h-full"
          />
          <div className="absolute top-3 left-3 px-2 py-1 bg-sky-500 rounded-lg text-[10px] text-white flex items-center gap-1 font-bold">
            <Tv className="w-3 h-3" />
            <span>Bilibili 哔哩哔哩</span>
          </div>
        </div>
      )}

      {/* 4. Xiaohongshu Share Card */}
      {isXiaohongshu && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center justify-between hover:bg-red-500/10 transition-all duration-300">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-md">
              小红书
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">检测到小红书分享链接</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">点击下方直接看源帖子或复制扩列</p>
            </div>
          </div>
          <a
            href={videoLink || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 py-1.5 px-3 bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl font-semibold transition-colors"
          >
            <Share2 className="w-3 h-3" />
            <span>直达链接</span>
          </a>
        </div>
      )}
    </div>
  );
}

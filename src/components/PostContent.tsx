import React, { useState, useEffect } from 'react';
import { ExternalLink, ShoppingBag, Video, Image as ImageIcon } from 'lucide-react';

interface PostContentProps {
  content: string;
}

export default function PostContent({ content }: PostContentProps) {
  // Regex to find markdown images ![alt](url)
  const mdImgRegex = /!\[.*?\]\((https?:\/\/[^\s]+)\)/g;
  
  // Extract images
  const images = Array.from(content.matchAll(mdImgRegex)).map(m => m[1]);
  
  // Remove images from text to process links
  const textWithoutImages = content.replace(mdImgRegex, '').trim();

  // Regex to find URLs
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = textWithoutImages.split(urlRegex);
  const links = textWithoutImages.match(urlRegex) || [];
  
  return (
    <div className="space-y-4">
      {textWithoutImages && (
        <p className="text-slate-300 whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              return (
                <a 
                  key={i} 
                  href={part} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-400 hover:underline break-all"
                >
                  {part}
                </a>
              );
            }
            return <React.Fragment key={i}>{part}</React.Fragment>;
          })}
        </p>
      )}
      
      {images.length > 0 && (
        <div className={`mt-3 ${images.length === 1 ? 'grid grid-cols-1' : 'grid grid-cols-2 sm:grid-cols-3'} gap-2`}>
          {images.map((imgUrl, i) => {
            const isFirst = i === 0;
            return (
              <div 
                key={i} 
                className={`rounded-xl overflow-hidden bg-slate-800 border border-white/10 ${
                  isFirst && images.length > 1 ? 'col-span-2 sm:col-span-3 aspect-[4/3] sm:aspect-video' : 
                  isFirst && images.length === 1 ? 'aspect-[3/4] sm:aspect-square max-h-[500px]' : 
                  'aspect-square'
                }`}
              >
                <img 
                  src={imgUrl} 
                  alt="User upload" 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
                  loading="lazy" 
                />
              </div>
            );
          })}
        </div>
      )}
      
      {links.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {links.map((url, i) => (
            <React.Fragment key={i}>
              <PlatformLinkCard url={url} />
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

function PlatformLinkCard({ url }: { url: string }) {
  const [metadata, setMetadata] = useState<{title: string | null, image: string | null} | null>(null);

  useEffect(() => {
    fetch(`/api/metadata?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(data => {
        if (data.image || data.title) {
          setMetadata(data);
        }
      })
      .catch(() => {});
  }, [url]);

  let platform = 'Website Link';
  let Icon = ExternalLink;
  let bgColor = 'bg-slate-800/50';
  let textColor = 'text-slate-300';
  let hoverBorder = 'hover:border-slate-500/50';
  let iconColor = 'text-slate-400';
  let description = 'Click to open in new tab';

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();

    if (domain.includes('xiaohongshu.com') || domain.includes('xhslink.com')) {
      platform = 'Xiaohongshu Post';
      Icon = ImageIcon;
      hoverBorder = 'hover:border-red-500/50';
      iconColor = 'text-red-400';
      description = 'View post on Xiaohongshu';
    } else if (domain.includes('taobao.com') || domain.includes('tb.cn')) {
      platform = 'Taobao Product';
      Icon = ShoppingBag;
      hoverBorder = 'hover:border-orange-500/50';
      iconColor = 'text-orange-400';
      description = 'View product on Taobao';
    } else if (domain.includes('pinduoduo.com') || domain.includes('yangkeduo.com') || domain.includes('pdd.com')) {
      platform = 'Pinduoduo Item';
      Icon = ShoppingBag;
      hoverBorder = 'hover:border-rose-500/50';
      iconColor = 'text-rose-400';
      description = 'View item on Pinduoduo';
    } else if (domain.includes('goofish.com') || domain.includes('2.taobao.com') || domain.includes('xianyu')) {
      platform = 'Xianyu Item';
      Icon = ShoppingBag;
      hoverBorder = 'hover:border-yellow-500/50';
      iconColor = 'text-yellow-400';
      description = 'View secondhand item on Xianyu';
    } else if (domain.includes('jd.com')) {
      platform = 'JD.com Product';
      Icon = ShoppingBag;
      hoverBorder = 'hover:border-red-600/50';
      iconColor = 'text-red-500';
      description = 'View product on JD.com';
    } else if (domain.includes('joybuy.com')) {
      platform = 'Joybuy Product';
      Icon = ShoppingBag;
      hoverBorder = 'hover:border-red-500/50';
      iconColor = 'text-red-400';
      description = 'View product on Joybuy';
    } else if (domain.includes('bilibili.com') || domain.includes('b23.tv')) {
      platform = 'Bilibili Video';
      Icon = Video;
      hoverBorder = 'hover:border-blue-500/50';
      iconColor = 'text-blue-400';
      description = 'Watch video on Bilibili';
    } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      platform = 'YouTube Video';
      Icon = Video;
      hoverBorder = 'hover:border-red-500/50';
      iconColor = 'text-red-500';
      description = 'Watch video on YouTube';
    }
  } catch (e) {
    // If URL parsing fails, we fallback to defaults
  }

  // Check if we can embed
  let embedUrl = null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('bilibili.com')) {
      const bvid = urlObj.pathname.split('/').find(p => p.startsWith('BV'));
      if (bvid) embedUrl = `https://player.bilibili.com/player.html?bvid=${bvid}&high_quality=1&danmaku=0`;
    } else if (urlObj.hostname.includes('youtube.com')) {
      const v = urlObj.searchParams.get('v');
      if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
    } else if (urlObj.hostname.includes('youtu.be')) {
      const v = urlObj.pathname.slice(1);
      if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
    }
  } catch(e) {}

  if (embedUrl) {
    return (
      <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 mt-3">
        <iframe 
          src={embedUrl} 
          className="w-full h-full" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        ></iframe>
      </div>
    );
  }

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className={`block overflow-hidden rounded-xl border border-white/5 transition-all duration-200 ${bgColor} ${hoverBorder} group`}
    >
      {metadata?.image && (
        <div className="w-full aspect-[4/3] bg-slate-900 overflow-hidden relative">
          <img 
            src={metadata.image} 
            alt="Link preview" 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        </div>
      )}
      <div className="p-3 flex items-start gap-3">
        <div className={`p-2 rounded-lg bg-white/5 ${iconColor} group-hover:scale-110 transition-transform flex-shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold truncate ${textColor}`}>{metadata?.title || platform}</h4>
          <p className="text-xs text-slate-500 truncate mt-0.5">{description}</p>
          <p className="text-[10px] text-slate-600 truncate mt-1">{url}</p>
        </div>
      </div>
    </a>
  );
}

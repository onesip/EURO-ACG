import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Heart } from 'lucide-react';
import { cn } from '../lib/utils';

// Simple memoized cache for the transparent mascot data URL
let cachedTransparentMascotUrl = '';

export function getTransparentMascot(src: string = '/logo.jpg'): Promise<string> {
  return new Promise((resolve) => {
    if (cachedTransparentMascotUrl) {
      resolve(cachedTransparentMascotUrl);
      return;
    }
    const img = new Image();
    img.src = src;
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width || 300;
      canvas.height = img.height || 300;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i+1];
          const b = data[i+2];
          
          // White background keying with high performance
          const brightness = (r + g + b) / 3;
          if (brightness > 215) {
            data[i+3] = 0; // Alpha = 0 (Transparent)
          }
        }
        ctx.putImageData(imgData, 0, 0);
        cachedTransparentMascotUrl = canvas.toDataURL();
        resolve(cachedTransparentMascotUrl);
      } catch (e) {
        // Fallback for CORS or loading error
        resolve(src);
      }
    };
    img.onerror = () => {
      resolve(src);
    };
  });
}

export type StickerExpression = 'happy' | 'shy' | 'angry' | 'cry' | 'shocked' | 'sleep';

export interface MascotStickerProps {
  expression: StickerExpression;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const STICKER_META: Record<StickerExpression, { zh: string; en: string; icon: string }> = {
  happy: { zh: '好耶！(๑>▽<๑)/*', en: 'Yay! (๑>▽<๑)/*', icon: '🎉' },
  shy: { zh: '贴贴萌友 💖', en: 'Cling with pal 💖', icon: '🌸' },
  angry: { zh: '超凶哦！💢', en: 'Super Mad! 💢', icon: '💢' },
  cry: { zh: '委屈哭哭 ｡ﾟ･(>_<)･ﾟ｡', en: 'Sobbing... ｡ﾟ･(>_<)･ﾟ｡', icon: '💧' },
  shocked: { zh: '大吃一惊！⚡', en: 'Nani?! ⚡', icon: '⚡' },
  sleep: { zh: '呼呼... zZZ', en: 'Zzz... Sleeping', icon: '💤' }
};

export default function MascotSticker({ expression, size = 'md', showLabel = true, className }: MascotStickerProps) {
  const [imgUrl, setImgUrl] = useState<string>('/logo.jpg');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getTransparentMascot('/logo.jpg').then(url => {
      setImgUrl(url);
      setLoaded(true);
    });
  }, []);

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-24 h-24',
    lg: 'w-36 h-36'
  };

  // Expression-specific animation definitions
  const getAnimationProps = () => {
    switch (expression) {
      case 'happy':
        return {
          animate: { y: [0, -6, 0], scale: [1, 1.04, 1] },
          transition: { repeat: Infinity, duration: 1.4, ease: "easeInOut" }
        };
      case 'shy':
        return {
          animate: { rotate: [-5, 5, -5], y: [0, -2, 0] },
          transition: { repeat: Infinity, duration: 2.2, ease: "easeInOut" }
        };
      case 'angry':
        return {
          animate: { x: [-1.5, 1.5, -1.5, 1.5, 0], y: [1, -1, 1, -1, 0] },
          transition: { repeat: Infinity, duration: 0.22, ease: "linear" }
        };
      case 'cry':
        return {
          animate: { y: [-0.8, 0.8, -0.8], scale: [0.99, 1, 0.99] },
          transition: { repeat: Infinity, duration: 0.16, ease: "linear" }
        };
      case 'shocked':
        return {
          animate: { scale: [1, 1.12, 1], rotate: [-1, 1, -1] },
          transition: { repeat: Infinity, duration: 0.5, ease: "easeInOut" }
        };
      case 'sleep':
        return {
          animate: { scale: [1, 1.03, 1], rotate: [1, -1, 1] },
          transition: { repeat: Infinity, duration: 4.0, ease: "easeInOut" }
        };
      default:
        return {};
    }
  };

  return (
    <div className={cn("flex flex-col items-center justify-center select-none", className)}>
      <motion.div
        {...getAnimationProps()}
        className={cn("relative rounded-full flex items-center justify-center p-1", sizeClasses[size])}
      >
        {/* Expression Overlays */}
        {expression === 'happy' && (
          <>
            {/* Blushing cheeks */}
            <div className="absolute bottom-[30%] left-[20%] w-3 h-1.5 bg-pink-500/40 rounded-full blur-[1px] animate-pulse" />
            <div className="absolute bottom-[30%] right-[20%] w-3 h-1.5 bg-pink-500/40 rounded-full blur-[1px] animate-pulse" />
            
            {/* Sparkles drifting up */}
            <motion.div
              animate={{ y: [10, -20], opacity: [0, 1, 0], scale: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
              className="absolute -top-1 -left-1 text-yellow-400"
            >
              <Sparkles className="w-4 h-4 fill-yellow-400/20" />
            </motion.div>
            <motion.div
              animate={{ y: [15, -15], opacity: [0, 1, 0], scale: [0.5, 0.9, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.8, delay: 0.4, ease: "easeOut" }}
              className="absolute -top-3 -right-1 text-amber-400"
            >
              <Sparkles className="w-3.5 h-3.5 fill-amber-400/10" />
            </motion.div>
          </>
        )}

        {expression === 'shy' && (
          <>
            {/* Heartwarming blushes */}
            <div className="absolute bottom-[28%] left-[18%] w-4 h-2 bg-rose-500/50 rounded-full blur-[2px]" />
            <div className="absolute bottom-[28%] right-[18%] w-4 h-2 bg-rose-500/50 rounded-full blur-[2px]" />
            
            {/* Floating hearts */}
            <motion.div
              animate={{ y: [5, -25], x: [0, -5, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2.0, ease: "easeOut" }}
              className="absolute -top-2 left-0 text-rose-500"
            >
              <Heart className="w-4 h-4 fill-rose-500" />
            </motion.div>
            <motion.div
              animate={{ y: [8, -20], x: [0, 6, 0], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 1.7, delay: 0.6, ease: "easeOut" }}
              className="absolute -top-4 right-1 text-pink-400"
            >
              <Heart className="w-3 h-3 fill-pink-400" />
            </motion.div>
          </>
        )}

        {expression === 'angry' && (
          <>
            {/* Anger veins */}
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 0.4 }}
              className="absolute -top-1.5 -right-1.5 text-red-500 text-lg font-black filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
            >
              💢
            </motion.div>
            {/* Red aura tint */}
            <div className="absolute inset-0 bg-red-500/10 rounded-full pointer-events-none mix-blend-color-burn" />
          </>
        )}

        {expression === 'cry' && (
          <>
            {/* Sad blue shading */}
            <div className="absolute inset-0 bg-indigo-500/15 rounded-full pointer-events-none" />
            {/* Teardrops flowing down */}
            <motion.div
              animate={{ y: [15, 35], opacity: [0, 1, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
              className="absolute bottom-[10%] left-[28%] text-cyan-400 text-xs"
            >
              💧
            </motion.div>
            <motion.div
              animate={{ y: [15, 38], opacity: [0, 1, 0.4, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, delay: 0.5, ease: "linear" }}
              className="absolute bottom-[10%] right-[28%] text-cyan-400 text-xs"
            >
              💧
            </motion.div>
          </>
        )}

        {expression === 'shocked' && (
          <>
            {/* Shaking sweatdrop */}
            <motion.div
              animate={{ y: [-2, 3], x: [-1, 1] }}
              transition={{ repeat: Infinity, duration: 0.1 }}
              className="absolute -top-1.5 left-2 text-blue-400 text-base"
            >
              💦
            </motion.div>
            {/* High-voltage sparkles */}
            <div className="absolute -top-3 right-0 text-yellow-400 text-sm font-mono animate-bounce">⚡</div>
          </>
        )}

        {expression === 'sleep' && (
          <>
            {/* Sleeping status bubbles */}
            <motion.div
              animate={{ y: [5, -20], x: [0, 5, 0], scale: [0.6, 1.2, 0.6], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
              className="absolute -top-3 -right-2 text-cyan-400 text-xs font-black font-mono"
            >
              zZZ
            </motion.div>
            <motion.div
              animate={{ y: [10, -10], x: [0, -3, 0], scale: [0.5, 0.9, 0.5], opacity: [0, 0.8, 0] }}
              transition={{ repeat: Infinity, duration: 3.2, delay: 1.2, ease: "easeOut" }}
              className="absolute -top-1 -left-2 text-indigo-400 text-[10px] font-bold font-mono"
            >
              zzZ
            </motion.div>
          </>
        )}

        {/* Mascot Core Image (white-background removed) */}
        <img
          src={imgUrl}
          alt={`Mascot Expression ${expression}`}
          className={cn(
            "w-full h-full object-cover rounded-full select-none transition-all duration-300",
            !loaded && "blur-xs opacity-50",
            expression === 'angry' && "shadow-[0_0_15px_rgba(239,68,68,0.4)] border border-red-500/20",
            expression === 'shy' && "shadow-[0_0_15px_rgba(244,114,182,0.4)] border border-pink-500/20",
            expression === 'happy' && "shadow-[0_0_15px_rgba(234,179,8,0.3)] border border-yellow-500/20",
            expression === 'cry' && "shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-500/20",
            expression === 'sleep' && "shadow-[0_0_12px_rgba(99,102,241,0.2)] opacity-90 border border-indigo-500/10"
          )}
          referrerPolicy="no-referrer"
        />
      </motion.div>

      {/* Cute human-readable text label */}
      {showLabel && (
        <span className="text-[10px] mt-1 font-extrabold text-slate-300 bg-black/40 px-2 py-0.5 rounded-full border border-white/5 tracking-tight shadow-sm text-center max-w-[110px] truncate">
          {STICKER_META[expression].zh}
        </span>
      )}
    </div>
  );
}

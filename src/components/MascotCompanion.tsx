import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'motion/react';
import { X, MessageSquare, Sparkles, Volume2, HelpCircle, Heart, ChevronRight, ChevronLeft, Move } from 'lucide-react';
import { useLanguage } from './LanguageProvider';
import MascotSticker, { StickerExpression, STICKER_META } from './MascotSticker';
import { cn } from '../lib/utils';

interface CompanionDialog {
  expression: StickerExpression;
  zh: string;
  en: string;
}

const DIALOGUES: CompanionDialog[] = [
  {
    expression: 'happy',
    zh: '好耶！今天也要元气满满地摸鱼、吐槽、看番哦！ヾ(≧▽≦*)o',
    en: 'Yay! Let\'s enjoy a fully-charged day of chatting, venting, and anime! ヾ(≧▽≦*)o'
  },
  {
    expression: 'shy',
    zh: '唔……能在这个奇妙的二次元社区遇到你，是我最幸运的事啦…… (〃▽〃)',
    en: 'Umm... meeting you in this rift tavern is my ultimate highlight of the day... (〃▽〃)'
  },
  {
    expression: 'shocked',
    zh: '什、大吃一惊！你难道就是传说中的终极硬核漫展之王吗？！⚡',
    en: 'W-What?! Are you the legendary absolute king of cosplays and conventions?! ⚡'
  },
  {
    expression: 'angry',
    zh: '哼！你要是再不理我的话，我就要把你的心爱手办和海报全部偷偷藏起来啦！💢',
    en: 'Hmph! If you ignore me, I will secretly hide your favorite anime scale figures! 💢'
  },
  {
    expression: 'cry',
    zh: '呜呜委屈巴巴……今天有点无聊，你可以陪我多贴贴、说说话吗？(｡ﾟ･(>_<)･ﾟ｡)',
    en: 'Sobbing... It\'s quiet today. Could you pat my head and chat with me a bit? (｡ﾟ･(>_<)･ﾟ｡)'
  },
  {
    expression: 'sleep',
    zh: '呼呼……已经很晚啦！早点睡觉不掉头发哦，快抱着毛绒玩偶去见初音未来吧~ 💤',
    en: 'Zzz... It is getting super late! Protect your hairline, hug your plushie, and head to bed~ 💤'
  }
];

export default function MascotCompanion() {
  const { lang } = useLanguage();
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    const saved = localStorage.getItem('mascot_companion_minimized');
    return saved === 'true';
  });
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [showSpeech, setShowSpeech] = useState<boolean>(true);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const dragControls = useDragControls();
  const [isDragging, setIsDragging] = useState(false);
  const [isEdgeHidden, setIsEdgeHidden] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mascot_companion_minimized', String(isMinimized));
  }, [isMinimized]);

  // Periodically prompt cute speeches if expanded
  useEffect(() => {
    if (isMinimized || isEdgeHidden) return;

    const timer = setInterval(() => {
      // 30% chance to say something new
      if (Math.random() < 0.3) {
        const nextIdx = (currentIdx + 1) % DIALOGUES.length;
        setCurrentIdx(nextIdx);
        setShowSpeech(true);
        
        // Auto fade bubble after 6 seconds
        setTimeout(() => {
          setShowSpeech(false);
        }, 6000);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [isMinimized, currentIdx, isEdgeHidden]);

  // Auto show a speech bubble on initial load
  useEffect(() => {
    if (!isMinimized && !isEdgeHidden) {
      setShowSpeech(true);
      const fadeTimer = setTimeout(() => {
        setShowSpeech(false);
      }, 7000);
      return () => clearTimeout(fadeTimer);
    }
  }, [isMinimized, isEdgeHidden]);

  const handleMascotClick = () => {
    if (isDragging) return;
    if (isEdgeHidden) {
      setIsEdgeHidden(false);
      return;
    }
    // Cycle expression
    const nextIdx = (currentIdx + 1) % DIALOGUES.length;
    setCurrentIdx(nextIdx);
    setShowSpeech(true);
    
    // Play a tiny audio chime from system notification sounds
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.04, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.25);
      osc.start();
      osc.stop(audioContext.currentTime + 0.25);
    } catch (e) {
      // audio fail ignored
    }
  };

  const handleDragEnd = (event: any, info: any) => {
    setIsDragging(false);
    // Hide if dropped near the very right edge of screen
    if (!isMinimized && info.point.x > window.innerWidth - 60) {
      setIsEdgeHidden(true);
      setShowSpeech(false);
    } else {
      setIsEdgeHidden(false);
    }
  };

  const activeDialog = DIALOGUES[currentIdx];
  const activeExpression = activeDialog.expression;

  return (
    <motion.div 
      drag
      dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      animate={{ 
        x: (isEdgeHidden && !isMinimized) ? 40 : 0, 
        opacity: (isEdgeHidden && !isHovered && !isMinimized) ? 0.5 : 1 
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed bottom-5 right-5 z-[80] flex flex-col items-end font-sans transition-opacity cursor-grab active:cursor-grabbing",
        isEdgeHidden && "right-0" // stick to edge if hidden
      )}
      style={{ touchAction: 'none' }}
      ref={containerRef}
    >
      <AnimatePresence>
        {/* Expanded View */}
        {!isMinimized && (
          <div className="flex flex-col items-end gap-2.5 max-w-[280px] sm:max-w-[320px]">
            {/* Speech Bubble Dialog */}
            <AnimatePresence>
              {showSpeech && !isEdgeHidden && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 5 }}
                  className="bg-[#1b1c23]/95 border border-indigo-500/30 text-xs text-slate-200 p-3.5 rounded-2xl shadow-[0_4px_25px_rgba(99,102,241,0.2)] relative select-none cursor-default"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {/* Speech arrow */}
                  <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-[#1b1c23] border-r border-b border-indigo-500/30 transform rotate-45" />
                  
                  {/* Top indicators */}
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-indigo-400 font-extrabold tracking-wider uppercase">
                    <Sparkles className="w-3 h-3 text-pink-400 animate-pulse" />
                    <span>{lang === 'zh' ? 'EU酱' : 'EU-chan'}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-pink-400">{STICKER_META[activeExpression].icon}</span>
                  </div>

                  <p className="leading-relaxed font-medium">
                    {lang === 'zh' ? activeDialog.zh : activeDialog.en}
                  </p>

                  {/* Manual Close Speech bubble button */}
                  <button
                    onClick={() => setShowSpeech(false)}
                    className="absolute top-1.5 right-1.5 text-slate-500 hover:text-slate-300 transition-colors p-0.5 rounded"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mascot Companion Body */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
              className="flex items-center gap-3"
            >
              {/* Interaction tools / mood indicators */}
              {isHovered && !isEdgeHidden && !isDragging && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-black/60 border border-white/5 backdrop-blur-md p-1.5 rounded-xl flex flex-col gap-1 shadow-lg"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {DIALOGUES.map((dialog, index) => (
                    <button
                      key={dialog.expression}
                      onClick={() => {
                        setCurrentIdx(index);
                        setShowSpeech(true);
                      }}
                      className={cn(
                        "w-5 h-5 rounded-md flex items-center justify-center text-xs hover:bg-white/10 transition-all",
                        currentIdx === index ? "bg-indigo-600/30 border border-indigo-500/30" : ""
                      )}
                      title={STICKER_META[dialog.expression][lang === 'zh' ? 'zh' : 'en']}
                    >
                      {STICKER_META[dialog.expression].icon}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Companion Circle Frame */}
              <div className="relative group">
                <motion.button
                  onTap={(e) => { e.stopPropagation(); handleMascotClick(); }}
                  className={cn(
                    "relative p-1 bg-gradient-to-br from-indigo-500/30 via-pink-500/20 to-teal-400/20 rounded-full shadow-[0_4px_25px_rgba(99,102,241,0.35)] transition-all duration-300 cursor-pointer block",
                    !isEdgeHidden && "hover:shadow-[0_4px_30px_rgba(244,114,182,0.45)] hover:scale-105 active:scale-95"
                  )}
                  title={isEdgeHidden ? (lang === 'zh' ? '点击唤醒' : 'Click to wake') : (lang === 'zh' ? '戳我换心情~' : 'Poke me for new vibes!')}
                >
                  {/* Glowing halo ring */}
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-indigo-500 to-teal-400 rounded-full opacity-35 group-hover:opacity-75 blur-md animate-pulse transition-opacity pointer-events-none" />
                  
                  {/* Core Sticker */}
                  <MascotSticker
                    expression={isEdgeHidden ? 'sleep' : activeExpression}
                    size="sm"
                    showLabel={false}
                    className="relative z-10 w-12 h-12 sm:w-14 sm:h-14 border-2 border-white/10"
                  />
                </motion.button>

                {/* Minimize Companion Button */}
                {!isEdgeHidden && (
                  <motion.button
                    onTap={(e) => { 
                      e.stopPropagation(); 
                      setIsEdgeHidden(false);
                      setIsMinimized(true); 
                    }}
                    className="absolute -top-1 -right-1 bg-slate-900 border border-white/15 text-slate-400 hover:text-white p-1 rounded-full shadow-lg z-20 pointer-events-auto hover:bg-red-950 transition-colors"
                    title={lang === 'zh' ? '收起EU酱' : 'Collapse EU-chan'}
                  >
                    <X className="w-2.5 h-2.5" />
                  </motion.button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimized Floating Anchor */}
      {isMinimized && (
        <div className="relative group pointer-events-auto">
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onTap={() => {
              setIsEdgeHidden(false);
              setIsMinimized(false);
            }}
            className="p-2.5 bg-[#1b1c23] border border-indigo-500/40 text-indigo-400 hover:text-indigo-300 rounded-full shadow-[0_4px_20px_rgba(99,102,241,0.3)] hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center relative group"
            title={lang === 'zh' ? '召唤EU酱' : 'Summon EU-chan'}
          >
            {/* Badge indicator */}
            <span className="absolute -top-1.5 -right-1.5 bg-pink-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold animate-bounce shadow-sm">
              {STICKER_META[isEdgeHidden ? 'sleep' : activeExpression].icon}
            </span>
            {/* Rotating halo */}
            <div className="absolute inset-0 rounded-full border border-dashed border-indigo-500/30 animate-spin group-hover:opacity-100 transition-opacity" style={{ animationDuration: '6s' }} />
            <span className="text-base">👾</span>
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, ChevronRight, X, Sparkles, MapPin, MessageSquare, Camera, ShoppingBag, Users, Image as ImageIcon, UserCircle, LogIn } from 'lucide-react';

// Steps for the tour
const TOUR_STEPS = [
  {
    id: 'activities',
    title: '面基行动',
    desc: '找搭子、组团去漫展、跑团约饭都在这里！',
    icon: MapPin,
    mobilePos: { bottom: '100px', left: '16px' },
    desktopPos: { top: '150px', left: '270px' }
  },
  {
    id: 'community',
    title: '摸鱼广场',
    desc: '日常吐个槽，发个二次元段子，扩列吹水~',
    icon: MessageSquare,
    mobilePos: { bottom: '100px', left: '16px' },
    desktopPos: { top: '210px', left: '270px' }
  },
  {
    id: 'services',
    title: '神仙产粮',
    desc: '约毛娘、妆娘、摄影后期？这里全是大佬！',
    icon: Camera,
    mobilePos: { bottom: '100px', left: '50%', transform: 'translateX(-50%)' },
    desktopPos: { top: '270px', left: '270px' }
  },
  {
    id: 'market',
    title: '回血集市',
    desc: '吃土了？二手Cos服、谷子、手办快来回血！',
    icon: ShoppingBag,
    mobilePos: { bottom: '100px', right: '16px' },
    desktopPos: { top: '330px', left: '270px' }
  },
  {
    id: 'more',
    title: '探索更多',
    desc: '点击右下角的“更多”，可以找到次元羁绊册（同好名册）和再次打开本新手攻略哦！',
    icon: Sparkles,
    mobilePos: { bottom: '100px', right: '16px' },
    desktopPos: { top: '390px', left: '270px' }
  },
  {
    id: 'profile',
    title: '个性化装扮与登录',
    desc: '点击右上角头像（或侧边栏底部），登录注册后，就能更换专属头像、修改资料和切换深浅主题皮肤啦！快来打造你的次元专属身份！',
    icon: UserCircle,
    mobilePos: { top: '60px', right: '16px' },
    desktopPos: { bottom: '20px', left: '270px' }
  }
];

export function NewbieTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const [hasSeenTour, setHasSeenTour] = useState(true);

  useEffect(() => {
    // Check if user has seen tour
    const seen = localStorage.getItem('euroacg_tour_seen');
    if (!seen) {
      setHasSeenTour(false);
      setIsActive(true);
    }

    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleStartTour = () => {
      setIsActive(true);
      setCurrentStep(0);
    };
    window.addEventListener('start_newbie_tour', handleStartTour);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('start_newbie_tour', handleStartTour);
    };
  }, []);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      closeTour();
    }
  };

  const closeTour = () => {
    setIsActive(false);
    setHasSeenTour(true);
    localStorage.setItem('euroacg_tour_seen', 'true');
    setCurrentStep(0);
  };

  const startTour = () => {
    setIsActive(true);
    setCurrentStep(0);
  };

  return (
    <>
      {/* Permanent mini help button */}
      <AnimatePresence>
        {!isActive && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={startTour}
            className="fixed right-4 bottom-28 md:bottom-6 z-40 w-10 h-10 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 backdrop-blur-md shadow-[0_0_15px_rgba(99,102,241,0.3)] cursor-pointer"
          >
            <Gamepad2 className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tour Overlay */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-auto"
          >
            {/* Dark backdrop */}
            <div 
              className="absolute inset-0 bg-[#070709]/70 backdrop-blur-[2px]"
              onClick={closeTour}
            />

            {/* Tooltip Content */}
            {TOUR_STEPS.map((step, idx) => {
              if (idx !== currentStep) return null;
              
              const Icon = step.icon;
              const posStyle = isMobile ? step.mobilePos : step.desktopPos;
              const hasTopArrow = isMobile && step.mobilePos.top !== undefined;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 20 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="absolute flex flex-col pointer-events-auto"
                  style={posStyle as any}
                >
                  <div className="relative bg-gradient-to-br from-[#1c1c22] to-[#141416] border border-indigo-500/30 p-4 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.5),0_0_20px_rgba(99,102,241,0.2)] w-64 md:w-72">
                    {/* Cute pointing triangle */}
                    {isMobile ? (
                      hasTopArrow ? (
                        <div className="absolute -top-3 right-4 w-0 h-0 border-l-[12px] border-r-[12px] border-b-[12px] border-l-transparent border-r-transparent border-b-indigo-500/30">
                          <div className="absolute top-[2px] -left-[11px] w-0 h-0 border-l-[11px] border-r-[11px] border-b-[11px] border-l-transparent border-r-transparent border-b-[#141416]" />
                        </div>
                      ) : (
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[12px] border-l-transparent border-r-transparent border-t-indigo-500/30">
                          <div className="absolute -top-[13px] -left-[11px] w-0 h-0 border-l-[11px] border-r-[11px] border-t-[11px] border-l-transparent border-r-transparent border-t-[#141416]" />
                        </div>
                      )
                    ) : (
                      <div className="absolute top-1/2 -left-3 -translate-y-1/2 w-0 h-0 border-t-[12px] border-b-[12px] border-r-[12px] border-t-transparent border-b-transparent border-r-indigo-500/30">
                        <div className="absolute -top-[11px] -right-[13px] w-0 h-0 border-t-[11px] border-b-[11px] border-r-[11px] border-t-transparent border-b-transparent border-r-[#141416]" />
                      </div>
                    )}
                    
                    {/* Mascot header */}
                    <div className="absolute -top-6 -right-4 w-12 h-12 bg-[#0c0d12] rounded-full border border-indigo-500/40 flex items-center justify-center rotate-12 shadow-[0_0_10px_rgba(99,102,241,0.3)]">
                      <Gamepad2 className="w-6 h-6 text-pink-400" />
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-1">
                        {step.title}
                        <Sparkles className="w-3 h-3 text-cyan-400" />
                      </h3>
                    </div>
                    
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                      {step.desc}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                      <span className="text-xs font-mono text-slate-500">
                        {currentStep + 1} / {TOUR_STEPS.length}
                      </span>
                      <div className="flex gap-2">
                        <button 
                          onClick={closeTour}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                        >
                          跳过
                        </button>
                        <button 
                          onClick={handleNext}
                          className="px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors flex items-center gap-1"
                        >
                          {currentStep === TOUR_STEPS.length - 1 ? '出发！' : '下一步'}
                          {currentStep !== TOUR_STEPS.length - 1 && <ChevronRight className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Sparkles, Moon, Cpu, RefreshCw, Volume2, VolumeX } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'character' | 'portal' | 'logo'>('character');
  const [videoError, setVideoError] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  // Auto-transition phases if not using a video
  useEffect(() => {
    if (videoLoaded && !videoError) {
      // If video works, we let the video control the timing or transition
      return;
    }

    // Pure CSS/Framer Motion timing flow
    const t1 = setTimeout(() => {
      setPhase('portal');
    }, 1400); // Confused chibi phase

    const t2 = setTimeout(() => {
      setPhase('logo');
    }, 3200); // Portal active phase

    const t3 = setTimeout(() => {
      // Completed, trigger parent callback
      onComplete();
    }, 4800); // Logo fade phase

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete, videoLoaded, videoError]);

  // If there's a video in /public/splash.mp4, we can play it
  const handleVideoEnded = () => {
    onComplete();
  };

  const handleVideoCanPlay = () => {
    setVideoLoaded(true);
  };

  const handleVideoError = () => {
    setVideoError(true);
  };

  return (
    <div className="fixed inset-0 bg-[#070709] z-[9999] flex flex-col items-center justify-center overflow-hidden font-sans">
      {/* Optional HTML5 Video Player from /public/splash.mp4 */}
      {!videoError && (
        <video
          id="splash-video"
          src="/splash.mp4"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 z-10 ${
            videoLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          autoPlay
          muted={isMuted}
          playsInline
          onCanPlay={handleVideoCanPlay}
          onEnded={handleVideoEnded}
          onError={handleVideoError}
        />
      )}

      {/* Mute/Unmute toggle if video is playing */}
      {videoLoaded && !videoError && (
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="absolute top-5 right-5 z-20 p-2.5 rounded-full bg-black/40 border border-white/10 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95"
        >
          {isMuted ? <VolumeX className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* Web-Native Framer Motion Recreation (0KB Network, Stable, Butter-Smooth 60fps) */}
      {(!videoLoaded || videoError) && (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Cosmic background stars */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[10%] left-[15%] w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />
            <div className="absolute top-[30%] right-[20%] w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-40" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-[25%] left-[25%] w-2 h-2 bg-indigo-400 rounded-full animate-pulse opacity-50" />
            <div className="absolute bottom-[15%] right-[10%] w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse opacity-70" style={{ animationDuration: '2s' }} />
          </div>

          <AnimatePresence mode="wait">
            {/* Phase 1: Confused Character loading */}
            {phase === 'character' && (
              <motion.div
                key="character-phase"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center text-center px-6 relative"
              >
                {/* Floating Question Marks around character */}
                <motion.span
                  animate={{ y: [0, -10, 0], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: 0.1 }}
                  className="absolute -top-16 -left-12 text-3xl font-bold text-cyan-400 font-mono drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                >
                  ?
                </motion.span>
                <motion.span
                  animate={{ y: [0, -12, 0], opacity: [0.3, 0.9, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.8, delay: 0.5 }}
                  className="absolute -top-10 -right-10 text-4xl font-bold text-pink-400 font-mono drop-shadow-[0_0_10px_rgba(244,114,182,0.5)]"
                >
                  ?
                </motion.span>
                <motion.span
                  animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.2, delay: 0.8 }}
                  className="absolute -bottom-2 -left-16 text-2xl font-bold text-indigo-400 font-mono drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
                >
                  ?
                </motion.span>

                {/* Chibi Character Avatar Holder */}
                <div className="relative w-40 h-40 rounded-full border-4 border-indigo-500/30 p-1 bg-gradient-to-br from-indigo-500/20 via-pink-500/10 to-cyan-500/20 shadow-[0_0_40px_rgba(99,102,241,0.25)] flex items-center justify-center overflow-hidden">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-cyan-400/40 rounded-full"
                  />
                  
                  {/* Default fallback cute logo/chibi design */}
                  <div className="relative w-full h-full rounded-full bg-[#111115] flex items-center justify-center p-3">
                    <img 
                      src="/logo.jpg" 
                      alt="EuroACG Splash" 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        // If no logo.jpg, show interactive high tech icon
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    {/* Glowing Mascot Head Symbol inside */}
                    <Gamepad2 className="w-16 h-16 text-indigo-400 absolute opacity-30 group-hover:opacity-100 transition-opacity drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
                  </div>
                </div>

                {/* Subtitle / Loader */}
                <div className="mt-8 flex flex-col items-center gap-2">
                  <span className="text-sm font-semibold tracking-[0.25em] text-cyan-400 uppercase font-mono animate-pulse">
                    Connecting Neural Net...
                  </span>
                  <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                    <motion.div
                      initial={{ left: '-100%' }}
                      animate={{ left: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                      className="relative h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 w-1/2 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Phase 2: Futuristic Circuit Board Portal Portal */}
            {phase === 'portal' && (
              <motion.div
                key="portal-phase"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.2 }}
                transition={{ duration: 0.4 }}
                className="relative flex items-center justify-center"
              >
                {/* Circuit Grid background tracks */}
                <div className="absolute w-[450px] h-[450px] opacity-20 pointer-events-none">
                  {/* Glowing PCB lines crossing */}
                  <svg className="w-full h-full text-indigo-500" viewBox="0 0 100 100">
                    <path d="M 0,50 L 35,50 L 45,40 L 55,40 L 65,50 L 100,50" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                    <path d="M 50,0 L 50,35 L 40,45 L 40,55 L 50,65 L 50,100" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                    <circle cx="35" cy="50" r="1" className="fill-cyan-400" />
                    <circle cx="65" cy="50" r="1" className="fill-pink-400" />
                    <circle cx="50" cy="35" r="1" className="fill-cyan-400" />
                    <circle cx="50" cy="65" r="1" className="fill-pink-400" />
                  </svg>
                </div>

                {/* Glowing Concentric Rings with different rotations */}
                {/* Outermost Ring */}
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
                  className="w-80 h-80 rounded-full border border-dashed border-cyan-500/40 flex items-center justify-center p-4 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
                >
                  {/* Middle Ring */}
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="w-full h-full rounded-full border-2 border-indigo-500/30 flex items-center justify-center p-4 relative"
                    style={{ borderTopColor: '#6366F1', borderBottomColor: '#EC4899' }}
                  >
                    {/* Glowing track dots on the middle ring */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee]" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-pink-400 shadow-[0_0_10px_#f472b6]" />

                    {/* Innermost Ring */}
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                      className="w-full h-full rounded-full border border-cyan-400/20 flex items-center justify-center p-6 bg-[#0c0d12]/60 backdrop-blur-md"
                    >
                      {/* Central Sci-Fi Emblem */}
                      <motion.div 
                        animate={{ scale: [0.95, 1.05, 0.95] }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                        className="relative w-28 h-28 rounded-full bg-gradient-to-tr from-cyan-500/20 via-indigo-600/30 to-pink-500/20 border border-white/20 shadow-[0_0_30px_rgba(99,102,241,0.5)] flex items-center justify-center"
                      >
                        {/* Gamepad controller + moon icons */}
                        <div className="flex flex-col items-center gap-1">
                          <Gamepad2 className="w-10 h-10 text-cyan-400 drop-shadow-[0_0_8px_#22d3ee]" />
                          <div className="flex items-center gap-1.5">
                            <Moon className="w-4 h-4 text-pink-400 drop-shadow-[0_0_6px_#f472b6]" />
                            <Sparkles className="w-4 h-4 text-indigo-400 drop-shadow-[0_0_6px_#818cf8]" />
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Glowing Core Aura */}
                <div className="absolute w-44 h-44 rounded-full bg-indigo-500/10 blur-[60px] animate-pulse" />
              </motion.div>
            )}

            {/* Phase 3: EuroACG Logo Reveal */}
            {phase === 'logo' && (
              <motion.div
                key="logo-phase"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center text-center px-6"
              >
                {/* Futuristic Logo Title */}
                <motion.h1 
                  initial={{ letterSpacing: '0.1em' }}
                  animate={{ letterSpacing: '0.25em' }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className="text-5xl md:text-6xl font-extrabold tracking-widest text-white drop-shadow-[0_0_25px_rgba(99,102,241,0.6)]"
                >
                  EURO<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-pink-400 to-cyan-400">ACG</span>
                </motion.h1>

                {/* Tech bar ornament */}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: 240 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-0.5 bg-gradient-to-r from-cyan-400 via-indigo-500 to-pink-500 rounded-full mt-4 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                />

                {/* Subtext */}
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0.8, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-xs md:text-sm font-mono tracking-[0.4em] uppercase text-slate-300 mt-4 pl-[0.4em]"
                >
                  ANIME | COMIC | GAMES
                </motion.p>

                {/* Tiny circuit card detail */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.4 }}
                  transition={{ delay: 0.9 }}
                  className="mt-12 flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-mono text-slate-500"
                >
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>v2.4.0 • PRODUCTION_BUILD</span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

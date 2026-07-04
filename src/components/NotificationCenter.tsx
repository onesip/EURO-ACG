import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { Bell, BellRing, Check, CheckCheck, Trash2, X, Sparkles, MessageSquare, Heart, UserPlus, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppNotification } from '../lib/notifications';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

// Play synthesized cute chime (double-note retro game style notice chime)
export const playCuteChime = (soundEnabled: boolean) => {
  if (!soundEnabled) return;
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    // Tone 1: high sweet note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5
    
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: cute helper tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.23); // C6
    
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.5);
  } catch (err) {
    console.warn("Audio Context block or unsupported", err);
  }
};

export default function NotificationCenter({ inlineBell = false, onClosePanel }: { inlineBell?: boolean, onClosePanel?: () => void }) {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('acg_sound_notifications');
    return saved !== 'false';
  });
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');

  const appLoadTime = useRef(Date.now());
  const processedToasts = useRef<Set<string>>(new Set());

  // Check browser push notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPushPermission(Notification.permission);
    }
  }, []);

  // Sync sound setting to localstorage
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('acg_sound_notifications', String(next));
      return next;
    });
  };

  // Ask for push notification permission
  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPushPermission(res);
        if (res === 'granted') {
          // Play a test chime and say hello
          playCuteChime(soundEnabled);
          new Notification(lang === 'zh' ? '✨ 欧罗巴ACG连接成功！' : '✨ EuroACG Connected!', {
            body: lang === 'zh' ? '已成功绑定手机通知频道！(*・ω・)ﾉ✧' : 'Mobile push notification is active!',
            icon: profile?.photoURL || '/logo.jpg'
          });
        }
      } catch (err) {
        console.error("Failed to request push permission", err);
      }
    }
  };

  // Real-time listener for Firestore notifications
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: AppNotification[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          ...data
        } as AppNotification);
      });

      // Sort in-memory latest first to avoid requiring a composite index
      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeB - timeA;
      });

      const slicedList = list.slice(0, 25);
      setNotifications(slicedList);

      // Check for incoming NEW notifications to trigger toast and push alerts
      slicedList.forEach(notif => {
        // Only trigger for notifications created AFTER application loaded
        // and which haven't been toasted/processed yet in this session
        const notifTime = notif.createdAt?.toMillis ? notif.createdAt.toMillis() : Date.now();
        const isRecent = notifTime > appLoadTime.current - 10000; // Allow 10 seconds leeway
        
        if (isRecent && !notif.isRead && !processedToasts.current.has(notif.id)) {
          processedToasts.current.add(notif.id);

          // Add to visual toast queue
          setActiveToasts(prev => [...prev, notif]);

          // Play cutest synthesized sound chime!
          playCuteChime(soundEnabled);

          // Trigger native Mobile / OS Push Notification
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(notif.title, {
              body: notif.content,
              icon: notif.senderPhoto || '/logo.jpg',
              tag: notif.id
            });
          }

          // Auto remove visual toast after 6 seconds
          setTimeout(() => {
            setActiveToasts(prev => prev.filter(t => t.id !== notif.id));
          }, 6000);
        }
      });
    }, (error) => {
      console.error("Failed to subscribe to notifications:", error);
    });

    return () => unsubscribe();
  }, [user, soundEnabled, profile]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Mark a single notification as read and navigate
  const handleNotifClick = async (notif: AppNotification) => {
    setIsOpen(false);
    if (onClosePanel) onClosePanel();
    
    // Clear toast if clicking inside toast
    setActiveToasts(prev => prev.filter(t => t.id !== notif.id));

    try {
      if (!notif.isRead) {
        await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
      }
    } catch (err) {
      console.error("Failed to update notification status:", err);
    }

    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Mark all user notifications as read
  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.isRead) {
          batch.update(doc(db, 'notifications', n.id), { isRead: true });
        }
      });
      await batch.commit();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Clear all notifications
  const handleClearAll = async () => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        batch.delete(doc(db, 'notifications', n.id));
      });
      await batch.commit();
      setNotifications([]);
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    }
  };

  // Helper to get nice icons & colors based on type
  const getNotifMeta = (type: string) => {
    switch (type) {
      case 'like':
        return { icon: Heart, bg: 'bg-rose-500/10 text-rose-400', border: 'border-rose-500/20' };
      case 'comment':
        return { icon: MessageSquare, bg: 'bg-indigo-500/10 text-indigo-400', border: 'border-indigo-500/20' };
      case 'message':
        return { icon: Sparkles, bg: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/20' };
      case 'friend_request':
      case 'friend_accept':
        return { icon: UserPlus, bg: 'bg-emerald-500/10 text-emerald-400', border: 'border-emerald-500/20' };
      default:
        return { icon: Bell, bg: 'bg-slate-500/10 text-slate-400', border: 'border-white/5' };
    }
  };

  return (
    <>
      {/* 1. Global Floating Toast Deck - Renders at the top-right / top center of the screen */}
      <div className="fixed top-4 right-4 z-[9999] space-y-3 max-w-sm w-full pointer-events-none px-4">
        <AnimatePresence>
          {activeToasts.map((toast) => {
            const meta = getNotifMeta(toast.type);
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, x: 50 }}
                transition={{ type: 'spring', damping: 15 }}
                className={cn(
                  "pointer-events-auto w-full bg-[#141416]/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.6)] border flex gap-3 overflow-hidden group hover:shadow-indigo-500/10 transition-shadow",
                  meta.border
                )}
              >
                {/* Cute accent bar */}
                <div className="absolute top-0 bottom-0 left-0 w-1.5 bg-indigo-500" />
                
                {/* Sender Avatar */}
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 bg-slate-800">
                    {toast.senderPhoto ? (
                      <img src={toast.senderPhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                        {toast.senderName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full text-[9px] shadow-sm", meta.bg)}>
                    <meta.icon className="w-2.5 h-2.5" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-2 cursor-pointer" onClick={() => handleNotifClick(toast)}>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    {toast.title}
                  </p>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed line-clamp-2">
                    {toast.content}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[9px] text-indigo-400 font-semibold mt-2 hover:underline">
                    {lang === 'zh' ? '点击去瞧瞧 🐾' : 'Check it out 🐾'} <ArrowRight className="w-2.5 h-2.5" />
                  </span>
                </div>

                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveToasts(prev => prev.filter(t => t.id !== toast.id));
                  }}
                  className="shrink-0 p-1 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-colors self-start"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* 2. Header Bell Trigger */}
      {!inlineBell ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-all duration-300 active:scale-95",
            unreadCount > 0 ? "text-indigo-400 animate-pulse" : ""
          )}
          title={lang === 'zh' ? '消息通知中心' : 'Notification Center'}
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 text-indigo-400 animate-bounce" />
          ) : (
            <Bell className="w-5 h-5" />
          )}

          {/* Unread count badge */}
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4.5 h-4.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]">
              {unreadCount}
            </span>
          )}
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex flex-col items-center gap-1 px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-all font-bold text-xs"
        >
          <div className="flex items-center gap-1.5">
            <Bell className="w-4 h-4" />
            <span>{lang === 'zh' ? `电波通知 (${unreadCount})` : `Notifications (${unreadCount})`}</span>
          </div>
        </button>
      )}

      {/* 3. Dropdown Drawer/Slide-out Panel for Notifications */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-[#0A0A0B]/85 backdrop-blur-xs z-[999]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Sidebar Drawer container */}
            <motion.div
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              transition={{ type: 'spring', damping: 22 }}
              className="fixed top-0 bottom-0 right-0 w-full max-w-sm bg-[#141416] border-l border-white/10 shadow-2xl z-[1000] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-md font-bold text-white">
                    {lang === 'zh' ? '💞 同好契约电波' : '💞 Community Chimes'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Utility Row: Sound toggle, Push permission & Clear actions */}
              <div className="px-5 py-3.5 bg-[#1a1a1c] border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  {/* Chime Sound Toggle */}
                  <button 
                    onClick={toggleSound}
                    className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 font-medium"
                    title={lang === 'zh' ? '静音/开启二次元提示音' : 'Mute/Unmute audio alerts'}
                  >
                    {soundEnabled ? (
                      <>
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[10px]">{lang === 'zh' ? '电波音效: 开' : 'Audio: ON'}</span>
                      </>
                    ) : (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px]">{lang === 'zh' ? '电波音效: 关' : 'Audio: OFF'}</span>
                      </>
                    )}
                  </button>

                  {/* Browser Native Push Permission State */}
                  {pushPermission !== 'granted' ? (
                    <button
                      onClick={requestPushPermission}
                      className="text-indigo-400 hover:text-indigo-300 font-bold text-[10px] px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/15"
                    >
                      📢 {lang === 'zh' ? '开启手机锁屏弹窗' : 'Enable Mobile Push'}
                    </button>
                  ) : (
                    <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-1">
                      ● {lang === 'zh' ? '手机锁屏通道已就绪' : 'Push Active'}
                    </span>
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{lang === 'zh' ? '全员已读' : 'Read All'}</span>
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="flex items-center gap-1 text-rose-400/80 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '一键退订所有历史' : 'Clear All'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications List Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-none p-2 space-y-1">
                {notifications.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400 px-8">
                      {lang === 'zh' 
                        ? '目前还没有收到任何契约电波哦~ 快去发帖、吐槽、或者添加同好死党吧！(●ˇ∀ˇ●)' 
                        : 'Your signal wave is currently calm! Go write posts or add friends to receive chimes! (●ˇ∀ˇ●)'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const meta = getNotifMeta(notif.type);
                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotifClick(notif)}
                        className={cn(
                          "relative p-3.5 rounded-2xl cursor-pointer hover:bg-white/5 transition-all duration-200 border flex gap-3 group overflow-hidden",
                          notif.isRead ? "bg-transparent border-transparent opacity-85" : "bg-indigo-500/5 border-indigo-500/10 shadow-sm"
                        )}
                      >
                        {/* New Unread Dot */}
                        {!notif.isRead && (
                          <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        )}

                        {/* Sender Avatar */}
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/5 bg-slate-800">
                            {notif.senderPhoto ? (
                              <img src={notif.senderPhoto} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-xs text-white">
                                {notif.senderName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className={cn("absolute -bottom-1 -right-1 p-1 rounded-full text-[9px] shadow-sm", meta.bg)}>
                            <meta.icon className="w-2.5 h-2.5" />
                          </div>
                        </div>

                        {/* Text Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-1.5">
                            <span className="text-xs font-bold text-white truncate max-w-[150px]">
                              {notif.senderName}
                            </span>
                            <span className="text-[9px] text-slate-500 shrink-0">
                              {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-indigo-300 mt-1">
                            {notif.title}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                            {notif.content}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom guide info */}
              <div className="p-4 bg-[#141416] border-t border-white/5 text-center text-[10px] text-slate-500">
                👾 {lang === 'zh' ? '由二次元超弦电波系统提供支持' : 'Powered by EuroACG Telepathy Network'}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

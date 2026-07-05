import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, writeBatch, getDocs, deleteDoc, setDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { Bell, BellRing, Check, CheckCheck, Trash2, X, Sparkles, MessageSquare, Heart, UserPlus, Volume2, VolumeX, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { AppNotification } from '../lib/notifications';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useUserProfileModal } from './UserProfileModal';

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
  const { showProfile } = useUserProfileModal();
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeToasts, setActiveToasts] = useState<AppNotification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('acg_sound_notifications');
    return saved !== 'false';
  });
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [friendRequests, setFriendRequests] = useState<any[]>([]);

  const appLoadTime = useRef(Date.now());
  const processedToasts = useRef<Set<string>>(new Set());

  // Real-time listener for pending friend requests
  useEffect(() => {
    if (!user) {
      setFriendRequests([]);
      return;
    }

    const q = query(
      collection(db, 'friendRequests'),
      where('toId', '==', user.uid),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(docSnap => {
        list.push({
          id: docSnap.id,
          ...docSnap.data()
        });
      });
      setFriendRequests(list);
    });

    return () => unsubscribe();
  }, [user]);

  // Handle accepting a friend request
  const handleAcceptFriendRequest = async (req: any) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      
      // Update request status to accepted
      batch.update(doc(db, 'friendRequests', req.id), { status: 'accepted' });
      
      // Add to friends subcollection for both users
      batch.set(doc(db, 'users', user.uid, 'friends', req.fromId), { 
        uid: req.fromId, 
        createdAt: serverTimestamp() 
      });
      batch.set(doc(db, 'users', req.fromId, 'friends', user.uid), { 
        uid: user.uid, 
        createdAt: serverTimestamp() 
      });
      
      await batch.commit();
      
      // Clear cache to force instant refresh in components
      localStorage.removeItem(`user_friends_list_${user.uid}`);
      localStorage.removeItem(`user_friends_list_${req.fromId}`);
      
      // Send a cute success notification
      const titleZh = "💖 羁绊缔结成功！(≧▽≦)/*";
      const titleEn = "💖 Soul Contract Signed!";
      const contentZh = `✨ 【${profile?.displayName || '同好'}】同意了你的死党契约！你们现在是真正的同好伙伴啦，快去私聊互动吧！`;
      const contentEn = `✨ 【${profile?.displayName || 'Pal'}】accepted your soul contract! You are now official friends! Go text each other!`;
      
      await addDoc(collection(db, 'notifications'), {
        userId: req.fromId,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'Pal',
        senderPhoto: profile?.photoURL || user.photoURL || '',
        type: 'friend_accept',
        title: lang === 'zh' ? titleZh : titleEn,
        content: lang === 'zh' ? contentZh : contentEn,
        link: '/profile',
        isRead: false,
        createdAt: serverTimestamp()
      });
      
    } catch (err) {
      console.error("Failed to accept friend request in NotificationCenter:", err);
    }
  };

  // Handle declining a friend request
  const handleDeclineFriendRequest = async (req: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'friendRequests', req.id), { status: 'rejected' });
    } catch (err) {
      console.error("Failed to decline friend request in NotificationCenter:", err);
    }
  };

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

  const unreadCount = notifications.filter(n => !n.isRead).length + friendRequests.length;

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

    // If it's a friend request or acceptance notification and senderId is present, view profile
    if ((notif.type === 'friend_request' || notif.type === 'friend_accept') && notif.senderId) {
      showProfile(notif.senderId, { displayName: notif.senderName, photoURL: notif.senderPhoto });
    } else if (notif.link && notif.link.trim() !== '') {
      navigate(notif.link);
    } else if (notif.type === 'message' && notif.senderId) {
      navigate(`/community?friend=${notif.senderId}`);
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
      {createPortal(
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
              {/* Header with extra top padding on mobile to clear notch */}
              <div className="pt-14 pb-5 px-5 md:pt-5 border-b border-white/5 flex items-center justify-between">
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
                    <span className="text-slate-500">{lang === 'zh' ? '消息管理' : 'Message Management'}</span>
                    <button
                      onClick={handleMarkAllRead}
                      disabled={notifications.every(n => n.isRead)}
                      className={cn(
                        "flex items-center gap-1 transition-colors font-semibold",
                        notifications.some(n => !n.isRead) 
                          ? "text-indigo-400 hover:text-indigo-300" 
                          : "text-slate-600 cursor-not-allowed"
                      )}
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{lang === 'zh' ? '一键已读所有信息' : 'Read All Messages'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Notifications List Container */}
              <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-none p-2 space-y-1">
                {/* Pending Friend Requests Section */}
                {friendRequests.length > 0 && (
                  <div className="p-2.5 mb-3 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-400 px-1 flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 animate-pulse" />
                      <span>{lang === 'zh' ? '待处理死党契约申请' : 'Pending Soul Contracts'}</span>
                      <span className="bg-indigo-500 text-white text-[9px] px-1.5 py-0.5 rounded-full ml-auto font-mono">
                        {friendRequests.length}
                      </span>
                    </h4>
                    
                    <div className="space-y-1.5">
                      {friendRequests.map((req) => (
                        <div key={req.id} className="p-3 bg-[#1b1c23] rounded-xl border border-white/5 flex flex-col gap-2.5">
                          <div 
                            onClick={() => showProfile(req.fromId, { displayName: req.fromName, photoURL: req.fromPhoto })}
                            className="flex items-center gap-2.5 cursor-pointer hover:bg-white/5 p-1 rounded-lg transition-all"
                            title={lang === 'zh' ? '查看本命资料' : 'View user profile'}
                          >
                            <img 
                              src={req.fromPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.fromId}`} 
                              alt="" 
                              className="w-8 h-8 rounded-full border border-white/10 object-cover shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-white truncate hover:text-indigo-400 transition-colors">{req.fromName}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{lang === 'zh' ? '想要与你缔结死党契约' : 'Wants to be your BFF'}</p>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => showProfile(req.fromId, { displayName: req.fromName, photoURL: req.fromPhoto })}
                              className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold rounded-lg transition-colors border border-indigo-500/15"
                            >
                              {lang === 'zh' ? '查看本命' : 'View Profile'}
                            </button>
                            <button
                              onClick={() => handleAcceptFriendRequest(req)}
                              className="flex-1 py-1.5 bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-indigo-600 hover:to-pink-600 text-white text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-sm"
                            >
                              {lang === 'zh' ? '契约达成' : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleDeclineFriendRequest(req)}
                              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-bold rounded-lg transition-colors"
                            >
                              {lang === 'zh' ? '婉拒' : 'Decline'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {notifications.length === 0 ? (
                  <div className="py-20 text-center space-y-4 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400 px-8 leading-relaxed">
                      {lang === 'zh' 
                        ? friendRequests.length > 0 
                          ? '上方有待处理的死党契约申请，快去通过吧！(*・ω・)ﾉ✧\n新收到的私信也会在这里提示哦~'
                          : '目前还没有收到任何新消息或契约电波哦~\n新收到的同好私信、帖子回复都会在这里提醒！(●ˇ∀ˇ●)' 
                        : 'Your signal wave is currently calm! Go write posts or add friends to receive chimes! (●ˇ∀ˇ●)'}
                    </p>
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        if (onClosePanel) onClosePanel();
                        navigate('/community');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold text-slate-300 transition-colors mt-2"
                    >
                      {lang === 'zh' ? '前往同好大厅看看' : 'Go to Community'}
                    </button>
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
                        <div 
                          className="relative shrink-0 cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (notif.senderId) {
                              showProfile(notif.senderId, { displayName: notif.senderName, photoURL: notif.senderPhoto });
                            }
                          }}
                          title={lang === 'zh' ? '查看用户资料' : 'View user profile'}
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/5 bg-slate-800 hover:border-indigo-500/50 transition-all">
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
                            <span 
                              className="text-xs font-bold text-white truncate max-w-[150px] cursor-pointer hover:text-indigo-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notif.senderId) {
                                  showProfile(notif.senderId, { displayName: notif.senderName, photoURL: notif.senderPhoto });
                                }
                              }}
                              title={lang === 'zh' ? '查看用户资料' : 'View user profile'}
                            >
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
      </AnimatePresence>,
      document.body
    )}
    </>
  );
}

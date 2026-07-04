import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { playCuteChime } from './NotificationCenter';
import { X, Sparkles, Bell, Heart, Coffee, Moon, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Daily Cute Reminders schema
interface CuteReminder {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'water' | 'sleep';
  titleZh: string;
  titleEn: string;
  contentZh: string;
  contentEn: string;
  icon: string;
  triggerHourStart: number;
  triggerHourEnd: number;
}

const DAILY_REMINDERS: CuteReminder[] = [
  {
    id: 'breakfast',
    type: 'breakfast',
    titleZh: '🥐 元气早点点！',
    titleEn: '🥐 Morning Fuel!',
    contentZh: '☕ (。・ω・。) 早安，萌友！早饭是一天的灵魂，今天也要元气满满地开启漫展/工作/学习之旅哦！',
    contentEn: '☕ Good morning, pal! Breakfast is the soul of your day. Have a great meal before starting!',
    icon: '🥐',
    triggerHourStart: 7,
    triggerHourEnd: 9
  },
  {
    id: 'lunch',
    type: 'lunch',
    titleZh: '🍱 欧罗巴干饭魂！',
    titleEn: '🍱 Lunch Time!',
    contentZh: '🍱 叮咚！干饭时间到！不管手头有多忙，都要按时享用美味的午餐哦！干饭人，开动！',
    contentEn: '🍱 Ding-dong! Lunch time! Grab a delicious meal and give yourself a well-deserved break!',
    icon: '🍱',
    triggerHourStart: 12,
    triggerHourEnd: 14
  },
  {
    id: 'dinner',
    type: 'dinner',
    titleZh: '🍜 犒劳胃袋时间！',
    titleEn: '🍜 Dinner Time!',
    contentZh: '🍲 辛苦了一天，是时候吃顿美味的晚餐犒劳自己啦！今天有吃到想念的拉面或大餐吗？(*^▽^*)',
    contentEn: '🍲 You worked hard today! Treat yourself to a warm dinner. Eating good is a form of ACG self-care!',
    icon: '🍜',
    triggerHourStart: 18,
    triggerHourEnd: 20
  },
  {
    id: 'water',
    type: 'water',
    titleZh: '🥤 咕嘟咕嘟……生命之泉！',
    titleEn: '🥤 Hydration Check!',
    contentZh: '🥤 (๑•̀ㅂ•́)و✧ 萌友，你已经很久没有喝水啦！快站起来活动一下手腕、喝杯水，守护颈椎与水分，人人有责！',
    contentEn: '🥤 Hydration check! Stand up, stretch your wrists, and drink some water to stay active and healthy!',
    icon: '🥤',
    triggerHourStart: 15,
    triggerHourEnd: 17
  },
  {
    id: 'sleep',
    type: 'sleep',
    titleZh: '🌌 护发修仙预警！',
    titleEn: '🌌 Sleep Early, Pal!',
    contentZh: '🌌 (∪｡∪)｡｡｡ 太晚啦！熬夜修仙头发会掉光光的哦~ 快放下手机、抱紧毛绒玩偶去睡觉觉吧，晚安喵~',
    contentEn: '🌌 It is getting very late! Put down your phone, hug your plushie, and head to bed. Good night~',
    icon: '🌌',
    triggerHourStart: 23,
    triggerHourEnd: 5 // triggers late night until 5 am
  }
];

export default function InAppNoticeOverlay() {
  const { user, profile } = useAuth();
  const { lang } = useLanguage();

  const [activeAnnouncement, setActiveAnnouncement] = useState<{ id: string; title: string; content: string } | null>(null);
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [activeReminder, setActiveReminder] = useState<CuteReminder | null>(null);

  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<'announcement' | 'push_prompt' | 'cute_reminder' | null>(null);

  // sound settings
  const getSoundEnabled = () => {
    const saved = localStorage.getItem('acg_sound_notifications');
    return saved !== 'false';
  };

  useEffect(() => {
    // 1. Check for Active Announcement (highest priority)
    const checkAnnouncement = async () => {
      try {
        const q = query(
          collection(db, 'announcements'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const activeDoc = snap.docs.find(doc => doc.data().active === true);

        if (activeDoc) {
          const data = activeDoc.data();
          const seenKey = `seen_announcement_${activeDoc.id}`;
          const isSeen = localStorage.getItem(seenKey);

          if (!isSeen) {
            setActiveAnnouncement({
              id: activeDoc.id,
              title: data.title || '',
              content: data.content || ''
            });
            setActiveMode('announcement');
            setOverlayOpen(true);
            playCuteChime(getSoundEnabled());
            return true; // announcement shown
          }
        }
      } catch (err) {
        console.error('Failed to load announcements for popup:', err);
      }
      return false;
    };

    // 2. Check for Cute Periodic Reminders (second priority)
    const checkCuteReminders = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = now.toISOString().split('T')[0]; // "2026-07-04"

      for (const reminder of DAILY_REMINDERS) {
        // Hour matching logic
        let isHourMatch = false;
        if (reminder.type === 'sleep') {
          isHourMatch = currentHour >= reminder.triggerHourStart || currentHour < reminder.triggerHourEnd;
        } else {
          isHourMatch = currentHour >= reminder.triggerHourStart && currentHour < reminder.triggerHourEnd;
        }

        if (isHourMatch) {
          const reminderKey = `last_reminder_shown_${reminder.id}_${todayStr}`;
          const alreadyShown = localStorage.getItem(reminderKey);

          if (!alreadyShown) {
            setActiveReminder(reminder);
            setActiveMode('cute_reminder');
            setOverlayOpen(true);
            localStorage.setItem(reminderKey, 'true');
            playCuteChime(getSoundEnabled());
            // Mobile push notification
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(lang === "zh" ? reminder.titleZh : reminder.titleEn, {
                body: lang === "zh" ? reminder.contentZh : reminder.contentEn,
                icon: "/logo.jpg"
              });
            }
            return true; // reminder shown
          }
        }
      }
      return false;
    };

    // 3. Check for Push Notifications Prompt (third priority)
    // To make it sneaky and not annoying, we prompt after 15 seconds, and only if they haven't enabled permission and haven't dismissed it in 7 days
    const checkPushPermissionPrompt = () => {
      if (typeof window === 'undefined' || !('Notification' in window)) return false;
      
      const currentPermission = Notification.permission;
      if (currentPermission !== 'default') return false; // already granted or denied

      const lastPromptDismissed = localStorage.getItem('push_prompt_dismissed_time');
      const nowMs = Date.now();
      
      if (lastPromptDismissed) {
        const daysDiff = (nowMs - parseInt(lastPromptDismissed, 10)) / (1000 * 60 * 60 * 24);
        if (daysDiff < 7) {
          return false; // dismiss cooldown not expired
        }
      }

      // Sneaky delay: wait 15 seconds to trigger!
      const timer = setTimeout(() => {
        setShowPushPrompt(true);
        setActiveMode('push_prompt');
        setOverlayOpen(true);
        playCuteChime(getSoundEnabled());
            // Mobile push notification
            if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
              new Notification(lang === "zh" ? reminder.titleZh : reminder.titleEn, {
                body: lang === "zh" ? reminder.contentZh : reminder.contentEn,
                icon: "/logo.jpg"
              });
            }
      }, 15000);

      return () => clearTimeout(timer);
    };

    const runChecks = async () => {
      const shownAnn = await checkAnnouncement();
      if (shownAnn) return;

      const shownRem = checkCuteReminders();
      if (shownRem) return;

      checkPushPermissionPrompt();
    };

    // Run overlay checks after component mount (small 3s delay for seamless load)
    const initTimer = setTimeout(() => {
      runChecks();
    }, 3000);

    return () => clearTimeout(initTimer);
  }, []);

  const handleCloseAnnouncement = () => {
    if (activeAnnouncement) {
      localStorage.setItem(`seen_announcement_${activeAnnouncement.id}`, 'true');
    }
    setOverlayOpen(false);
    setActiveMode(null);
  };

  const handleEnablePush = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          playCuteChime(getSoundEnabled());
          new Notification(lang === 'zh' ? '✨ 通知授权成功！' : '✨ Notifications Enabled!', {
            body: lang === 'zh' ? '羁绊契约通知渠道已开启 (*^-^*)' : 'You will receive contract updates here!',
            icon: profile?.photoURL || '/logo.jpg'
          });
        }
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.setItem('push_prompt_dismissed_time', String(Date.now()));
    setOverlayOpen(false);
    setActiveMode(null);
  };

  const handleDismissPush = () => {
    localStorage.setItem('push_prompt_dismissed_time', String(Date.now()));
    setOverlayOpen(false);
    setActiveMode(null);
  };

  const handleCloseReminder = () => {
    setOverlayOpen(false);
    setActiveMode(null);
  };

  if (!overlayOpen || !activeMode) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 15 }}
          transition={{ type: 'spring', duration: 0.4 }}
          className="w-full max-w-sm bg-[#1b1c23] border border-indigo-500/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(99,102,241,0.25)] relative"
        >
          {/* Glowing Top Frame */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-pink-500 via-indigo-500 to-teal-400" />
          
          {/* Close button (top right) */}
          <button
            onClick={
              activeMode === 'announcement'
                ? handleCloseAnnouncement
                : activeMode === 'push_prompt'
                ? handleDismissPush
                : handleCloseReminder
            }
            className="absolute top-4 right-4 p-1.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-full transition-colors z-20"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Render based on active mode */}
          {activeMode === 'announcement' && activeAnnouncement && (
            <div className="p-6 pt-8 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📢</span>
                <h3 className="text-sm font-bold text-slate-400 tracking-wider uppercase">
                  {lang === 'zh' ? '✨ 社区高能公告 ✨' : '✨ Community Notice ✨'}
                </h3>
              </div>

              <div className="space-y-3 bg-[#0a0a0b]/80 border border-white/5 p-4 rounded-2xl">
                <h2 className="text-base font-black text-white leading-snug flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
                  <span>{activeAnnouncement.title}</span>
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto no-scrollbar">
                  {activeAnnouncement.content}
                </p>
              </div>

              {/* Cute Mascot footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-bold">
                  <span>(。・ω・。)</span>
                  <span>{lang === 'zh' ? 'Miku 友情播报' : 'Miku broadcast'}</span>
                </div>
                <button
                  onClick={handleCloseAnnouncement}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                >
                  {lang === 'zh' ? '我已收悉 / 了解啦！' : 'Acknowledge!'}
                </button>
              </div>
            </div>
          )}

          {activeMode === 'push_prompt' && (
            <div className="p-6 pt-8 text-center space-y-4">
              {/* Cute visual badge */}
              <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
                🔔
              </div>

              <div className="space-y-2">
                <h2 className="text-sm font-black text-white">
                  {lang === 'zh' ? '✨ 开启次元之门 (开启弹窗通知)' : '✨ Unlock Notification Gate'}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed px-2">
                  {lang === 'zh'
                    ? '萌友！要不要悄咪咪开启浏览器弹窗通知？这样当有同好向你递交死党契约、发起私聊或漫展召唤时，你就能第一时间秒收到啦！(*^-^*)'
                    : 'Enable push notifications so you never miss a soul contract, direct message, or cosplay photoshoot alert!'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleDismissPush}
                  className="py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-xs font-bold transition-all"
                >
                  {lang === 'zh' ? '下次一定喵~' : 'Maybe Later'}
                </button>
                <button
                  onClick={handleEnablePush}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/15"
                >
                  {lang === 'zh' ? '立即授权开启' : 'Enable Now!'}
                </button>
              </div>
            </div>
          )}

          {activeMode === 'cute_reminder' && activeReminder && (
            <div className="p-6 pt-8 space-y-4">
              {/* Cute visual badge */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-pink-500/10 border border-pink-500/20 rounded-xl flex items-center justify-center text-xl shrink-0">
                  {activeReminder.icon}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-pink-400 tracking-wider uppercase">
                    {lang === 'zh' ? '✨ 萌友温馨日常贴贴 ✨' : '✨ ACG Lifestyle Reminder ✨'}
                  </h3>
                  <h2 className="text-sm font-black text-white">
                    {lang === 'zh' ? activeReminder.titleZh : activeReminder.titleEn}
                  </h2>
                </div>
              </div>

              <div className="bg-[#0a0a0b]/80 border border-white/5 p-4 rounded-2xl">
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  &ldquo;{lang === 'zh' ? activeReminder.contentZh : activeReminder.contentEn}&rdquo;
                </p>
              </div>

              {/* Cute character indicator */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[10px] text-pink-400/80 font-bold">
                  (✿◡◡✿) {lang === 'zh' ? '暖心管家提醒' : 'Moyu Helper'}
                </div>
                <button
                  onClick={handleCloseReminder}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
                >
                  {lang === 'zh' ? '贴贴！知道啦' : 'Sweet! Got it'}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

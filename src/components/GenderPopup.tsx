import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useLanguage } from './LanguageProvider';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clearProfileCache } from '../lib/useUserProfile';
import { cn } from '../lib/utils';
import { Sparkles, Check } from 'lucide-react';
import { Gender } from '../types';

export default function GenderPopup() {
  const { user, profile, refreshProfile } = useAuth();
  const { lang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only prompt logged-in users whose profiles are loaded and gender is missing, empty, or not yet set
    if (user && profile) {
      const gender = profile.gender;
      if (!gender || gender === 'prefer-not-to-say') {
        // Show modal if gender is not set or has been left as prefer-not-to-say
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    } else {
      setIsOpen(false);
    }
  }, [user, profile]);

  if (!isOpen || !user || !profile) return null;

  const handleGenderSelect = (gender: Gender) => {
    setSelectedGender(gender);
  };

  const handleConfirm = async () => {
    if (!selectedGender) return;
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { gender: selectedGender, updatedAt: Date.now() }, { merge: true });
      clearProfileCache(user.uid);
      await refreshProfile();
      setIsOpen(false);
    } catch (err) {
      console.error('Failed to save gender:', err);
      alert(lang === 'zh' ? '保存性别失败，请重试' : 'Failed to save gender, please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gendersList = [
    { id: 'male' as Gender, name: '男生 / Boy', icon: '♂️', color: 'border-blue-500/20 hover:border-blue-500 text-blue-400 bg-blue-500/5' },
    { id: 'female' as Gender, name: '女生 / Girl', icon: '♀️', color: 'border-pink-500/20 hover:border-pink-500 text-pink-400 bg-pink-500/5' },
    { id: 'non-binary' as Gender, name: '非二元 / Non-Binary', icon: '⚧️', color: 'border-purple-500/20 hover:border-purple-500 text-purple-400 bg-purple-500/5' },
    { id: 'other' as Gender, name: '其他 / Other', icon: '✨', color: 'border-amber-500/20 hover:border-amber-500 text-amber-400 bg-amber-500/5' }
  ];

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 backdrop-blur-md bg-black/80 animate-fadeIn">
      <div className="w-full max-w-md bg-[#141416] border border-indigo-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(99,102,241,0.15)] flex flex-col gap-6 animate-scaleIn">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            {lang === 'zh' ? '补全你的本命档案' : 'Complete Your Profile'}
          </h2>
          <p className="text-xs text-slate-400 px-4">
            {lang === 'zh' 
              ? '为了在集结接龙和摸鱼社区展示真实的你，性别信息是必填项哦！' 
              : 'To participate in activities and community, selecting your gender is mandatory!'}
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-3">
          {gendersList.map((g) => {
            const isSelected = selectedGender === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => handleGenderSelect(g.id)}
                className={cn(
                  "p-4 rounded-2xl border text-center flex flex-col items-center gap-2 transition-all cursor-pointer relative overflow-hidden active:scale-95",
                  g.color,
                  isSelected && "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/10 scale-102"
                )}
              >
                <span className="text-2xl">{g.icon}</span>
                <span className="text-xs font-bold">{g.name}</span>
                
                {isSelected && (
                  <div className="absolute top-2 right-2 w-4 h-4 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          disabled={!selectedGender || isSubmitting}
          onClick={handleConfirm}
          className={cn(
            "w-full py-3.5 px-4 rounded-2xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2",
            selectedGender 
              ? "bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.02] cursor-pointer" 
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          )}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2 animate-pulse">
              {lang === 'zh' ? '正在连接档案库...' : 'Saving...'}
            </span>
          ) : (
            <span>{lang === 'zh' ? '确认并开启同步' : 'Confirm & Sync'}</span>
          )}
        </button>

      </div>
    </div>
  );
}

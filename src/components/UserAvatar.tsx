import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gender } from '../types';
import { cn } from '../lib/utils';

interface UserAvatarProps {
  uid: string;
  photoURL?: string;
  displayName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showGender?: boolean;
  onClick?: () => void;
  key?: React.Key;
}

// Global cache for profiles to avoid redundant fetches across multiple instances
const profileCache: Record<string, { gender: Gender; timestamp: number }> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export default function UserAvatar({ uid, photoURL, displayName, className, size = 'md', showGender = false, onClick }: UserAvatarProps) {
  const [gender, setGender] = useState<Gender | undefined>();

  useEffect(() => {
    if (!showGender || !uid) return;
    
    const fetchGender = async () => {
      try {
        // 1. Check memory cache first
        const now = Date.now();
        if (profileCache[uid] && (now - profileCache[uid].timestamp < CACHE_TTL)) {
          setGender(profileCache[uid].gender);
          return;
        }

        // 2. Check localStorage as second tier
        const cached = localStorage.getItem(`gender_${uid}`);
        if (cached) {
          const genderValue = cached as Gender;
          setGender(genderValue);
          profileCache[uid] = { gender: genderValue, timestamp: now };
          return;
        }

        // 3. Fetch from Firestore only if not cached
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.gender) {
            setGender(data.gender);
            localStorage.setItem(`gender_${uid}`, data.gender);
            profileCache[uid] = { gender: data.gender, timestamp: now };
          }
        }
      } catch (err) {
        console.error('Failed to fetch gender for avatar', err);
      }
    };

    fetchGender();
  }, [uid, showGender]);

  const sizeClasses = {
    'xs': 'w-6 h-6 text-[8px]',
    'sm': 'w-8 h-8 text-[10px]',
    'md': 'w-10 h-10 text-xs',
    'lg': 'w-12 h-12 text-sm',
    'xl': 'w-20 h-20 text-xl'
  };

  const badgeSizeClasses = {
    'xs': 'w-2 h-2 text-[4px]',
    'sm': 'w-3 h-3 text-[6px]',
    'md': 'w-4 h-4 text-[8px]',
    'lg': 'w-5 h-5 text-[10px]',
    'xl': 'w-7 h-7 text-sm'
  };

  const genderIcons = {
    male: '♂️',
    female: '♀️',
    'non-binary': '⚧️',
    'other': '✨'
  };

  const genderColors = {
    male: 'text-blue-400 border-blue-500/30',
    female: 'text-pink-400 border-pink-500/30',
    'non-binary': 'text-purple-400 border-purple-500/30',
    'other': 'text-amber-400 border-amber-500/30'
  };

  return (
    <div className={cn("relative shrink-0", onClick && "cursor-pointer")} onClick={onClick}>
      <div className={cn(
        "rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden transition-all shadow-[0_0_12px_rgba(99,102,241,0.1)] border-2 border-transparent hover:border-indigo-500/50",
        sizeClasses[size],
        className
      )}>
        {photoURL ? (
          <img src={photoURL} alt={displayName} className="w-full h-full object-cover" />
        ) : (
          displayName ? displayName.charAt(0).toUpperCase() : 'U'
        )}
      </div>
      
      {showGender && gender && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 bg-[#141416] border rounded-full flex items-center justify-center shadow-lg z-10 animate-scaleIn",
          badgeSizeClasses[size],
          genderColors[gender]
        )}>
          <span className="leading-none flex items-center justify-center">{genderIcons[gender]}</span>
        </div>
      )}
    </div>
  );
}

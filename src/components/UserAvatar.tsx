import React from 'react';
import { useUserProfile } from '../lib/useUserProfile';
import { cn } from '../lib/utils';

interface UserAvatarProps {
  uid: string;
  photoURL?: string;
  displayName?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showGender?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  key?: React.Key;
}

export default function UserAvatar({ uid, photoURL: staticPhotoURL, displayName: staticDisplayName, className, size = 'md', showGender = false, onClick }: UserAvatarProps) {
  // Use our real-time profile hook
  const { profile } = useUserProfile(uid, staticDisplayName, staticPhotoURL);
  
  // Resolve actual name and avatar (live first, then fall back to static props)
  const resolvedDisplayName = profile?.displayName || staticDisplayName || 'U';
  const resolvedPhotoURL = profile?.photoURL || staticPhotoURL;
  const resolvedGender = profile?.gender;

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
    'other': '✨',
    'prefer-not-to-say': '❓'
  };

  const genderColors = {
    male: 'text-blue-400 border-blue-500/30',
    female: 'text-pink-400 border-pink-500/30',
    'non-binary': 'text-purple-400 border-purple-500/30',
    'other': 'text-amber-400 border-amber-500/30',
    'prefer-not-to-say': 'text-slate-400 border-slate-500/30'
  };

  return (
    <div className={cn("relative shrink-0", onClick && "cursor-pointer")} onClick={onClick}>
      <div className={cn(
        "rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold overflow-hidden transition-all shadow-[0_0_12px_rgba(99,102,241,0.1)] border-2 border-transparent hover:border-indigo-500/50",
        sizeClasses[size],
        className
      )}>
        {resolvedPhotoURL ? (
          <img src={resolvedPhotoURL} alt={resolvedDisplayName} className="w-full h-full object-cover" />
        ) : (
          resolvedDisplayName ? resolvedDisplayName.charAt(0).toUpperCase() : 'U'
        )}
      </div>
      
      {showGender && resolvedGender && resolvedGender !== 'prefer-not-to-say' && (
        <div className={cn(
          "absolute -bottom-0.5 -right-0.5 bg-[#141416] border rounded-full flex items-center justify-center shadow-lg z-10 animate-scaleIn",
          badgeSizeClasses[size],
          genderColors[resolvedGender as keyof typeof genderColors] || 'text-slate-400'
        )}>
          <span className="leading-none flex items-center justify-center">
            {genderIcons[resolvedGender as keyof typeof genderIcons] || '✨'}
          </span>
        </div>
      )}
    </div>
  );
}

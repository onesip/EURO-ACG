import React from 'react';
import { useUserProfile } from '../lib/useUserProfile';
import { cn } from '../lib/utils';
import { Venus, Mars, Sparkles, HelpCircle } from 'lucide-react';

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
    'xs': 'w-3 h-3 p-0.5 border-2',
    'sm': 'w-4 h-4 p-0.5 border-2',
    'md': 'w-5 h-5 p-0.5 border-2',
    'lg': 'w-6 h-6 p-0.5 border-2',
    'xl': 'w-8 h-8 p-1 border-2'
  };

  const genderIcons = {
    male: <Mars className="w-full h-full stroke-[3]" />,
    female: <Venus className="w-full h-full stroke-[3]" />,
    'non-binary': <span className="font-sans font-black text-[9px] leading-none">⚧</span>,
    'other': <Sparkles className="w-full h-full stroke-[2.5]" />,
    'prefer-not-to-say': <HelpCircle className="w-full h-full stroke-[2.5]" />
  };

  const genderColors = {
    male: 'text-blue-400 border-blue-500/40 bg-slate-950 shadow-blue-500/10',
    female: 'text-pink-400 border-pink-500/40 bg-slate-950 shadow-pink-500/10',
    'non-binary': 'text-purple-400 border-purple-500/40 bg-slate-950 shadow-purple-500/10',
    'other': 'text-amber-400 border-amber-500/40 bg-slate-950 shadow-amber-500/10',
    'prefer-not-to-say': 'text-slate-400 border-slate-500/40 bg-slate-950'
  };

  return (
    <div className={cn("relative shrink-0 select-none", onClick && "cursor-pointer")} onClick={onClick}>
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
          "absolute bottom-0 right-0 translate-x-[20%] translate-y-[10%] rounded-full flex items-center justify-center shadow-lg z-10 animate-scaleIn",
          badgeSizeClasses[size],
          genderColors[resolvedGender as keyof typeof genderColors] || 'text-slate-400'
        )}>
          {genderIcons[resolvedGender as keyof typeof genderIcons]}
        </div>
      )}
    </div>
  );
}


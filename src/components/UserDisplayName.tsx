import React from 'react';
import { useUserProfile } from '../lib/useUserProfile';

interface UserDisplayNameProps {
  uid: string;
  fallbackName?: string;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
}

export default function UserDisplayName({ uid, fallbackName = '', className = '', onClick }: UserDisplayNameProps) {
  const { profile } = useUserProfile(uid, fallbackName);
  const name = profile?.displayName || fallbackName || '次元居民';
  
  return (
    <span 
      className={className} 
      onClick={onClick}
    >
      {name}
    </span>
  );
}

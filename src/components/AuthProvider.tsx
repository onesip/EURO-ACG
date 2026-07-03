import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, query, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { isQuotaExceeded, setQuotaExceeded as setQuotaHelper } from '../lib/quota';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  isQuotaExceeded: boolean;
  setQuotaExceeded: (val: boolean) => void;
  updateProfileOptimistically: (data: Partial<UserProfile>) => void;
  openLoginModal: () => void;
  setOpenLoginModal: (val: boolean) => void;
  isLoginModalOpen: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  isQuotaExceeded: false,
  setQuotaExceeded: () => {},
  updateProfileOptimistically: () => {},
  openLoginModal: () => {},
  setOpenLoginModal: () => {},
  isLoginModalOpen: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceededState, setQuotaExceededState] = useState(isQuotaExceeded());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const setQuotaExceeded = (val: boolean) => {
    setQuotaHelper(val);
    setQuotaExceededState(val);
  };

  const fetchProfile = async (uid: string) => {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setProfile(profileData);
        setQuotaExceeded(false); // Success! Clear quota if it was set
        // Cache profile
        localStorage.setItem(`profile_${uid}`, JSON.stringify(profileData));
      } else {
        // Create empty profile
        const newProfile: UserProfile = {
          uid,
          displayName: user?.displayName || auth.currentUser?.displayName || '',
          photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
          bio: '',
          role: 'other',
          favorites: { anime: '', characters: '', cp: '' },
          socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
        };
        await setDoc(docRef, newProfile);
        setProfile(newProfile);
        localStorage.setItem(`profile_${uid}`, JSON.stringify(newProfile));
      }
    } catch (err: any) {
      if (err?.code === 'resource-exhausted') {
        setQuotaExceeded(true);
      } else {
        console.error("Error fetching profile:", err);
      }
      
      // Fallback to cache
      const cached = localStorage.getItem(`profile_${uid}`);
      if (cached) {
        try {
          setProfile(JSON.parse(cached));
        } catch (_) {
          const fallbackProfile: UserProfile = {
            uid,
            displayName: user?.displayName || auth.currentUser?.displayName || 'ACG Fan',
            photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
            bio: 'Offline Profile (Database Quota Exceeded)',
            role: 'other',
            favorites: { anime: '', characters: '', cp: '' },
            socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
          };
          setProfile(fallbackProfile);
        }
      } else {
        const fallbackProfile: UserProfile = {
          uid,
          displayName: user?.displayName || auth.currentUser?.displayName || 'ACG Fan',
          photoURL: user?.photoURL || auth.currentUser?.photoURL || '',
          bio: 'Offline Profile (Database Quota Exceeded)',
          role: 'other',
          favorites: { anime: '', characters: '', cp: '' },
          socials: { x: '', instagram: '', xiaohongshu: '', wechat: '', qq: '' },
        };
        setProfile(fallbackProfile);
      }
    }
  };

  useEffect(() => {
    // Initial cleanup of old legacy quota flags
    localStorage.removeItem('quotaExceeded');
    localStorage.removeItem('quotaExceededAt');

    const until = localStorage.getItem('quotaExceededUntil');
    if (until) {
      const untilTime = parseInt(until, 10);
      if (isNaN(untilTime) || Date.now() > untilTime) {
        localStorage.removeItem('quotaExceededUntil');
        setQuotaExceeded(false);
      }
    }

    const checkRedirect = async () => {
      try {
        await getRedirectResult(auth);
      } catch (err: any) {
        console.error("Redirect Login Error:", err);
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.uid);
    }
  };

  const updateProfileOptimistically = (data: Partial<UserProfile>) => {
    if (!user) return;
    setProfile(prev => {
      const updated = prev ? { ...prev, ...data } : { uid: user.uid, ...data } as UserProfile;
      localStorage.setItem(`profile_${user.uid}`, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      refreshProfile, 
      isQuotaExceeded: isQuotaExceededState, 
      setQuotaExceeded,
      updateProfileOptimistically,
      openLoginModal: () => setIsLoginModalOpen(true),
      setOpenLoginModal: setIsLoginModalOpen,
      isLoginModalOpen
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

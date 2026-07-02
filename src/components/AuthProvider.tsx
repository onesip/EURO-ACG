import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  isQuotaExceeded: false,
  setQuotaExceeded: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isQuotaExceededState, setQuotaExceededState] = useState(isQuotaExceeded());

  const setQuotaExceeded = (val: boolean) => {
    setQuotaHelper(val);
    setQuotaExceededState(val);
  };

  const fetchProfile = async (uid: string) => {
    try {
      if (isQuotaExceeded()) {
        throw new Error('Quota exceeded');
      }
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setProfile(profileData);
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
    // Initial cleanup of old legacy quota flag
    localStorage.removeItem('quotaExceeded');
    localStorage.removeItem('quotaExceededAt');

    // Probe query to clear quota flag if it was false-positively set or has reset
    const probeQuota = async () => {
      try {
        const q = query(collection(db, 'posts'), limit(1));
        await getDocs(q);
        setQuotaExceeded(false);
      } catch (err: any) {
        if (err?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else {
          // For other errors, don't set quota but also don't necessarily clear it if it was already set
          // but if we are here and it's not resource-exhausted, we can at least say it's not a quota issue
          // However, if it's a network error, we don't know. 
          // But according to requirements: "只要任意一次 Firestore 读取成功，就立刻清除"
        }
      }
    };
    probeQuota();

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

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, isQuotaExceeded: isQuotaExceededState, setQuotaExceeded }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

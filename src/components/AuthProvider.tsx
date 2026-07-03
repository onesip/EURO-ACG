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
  updateProfileOptimistically: (data: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
  isQuotaExceeded: false,
  setQuotaExceeded: () => {},
  updateProfileOptimistically: () => {},
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

    // Probe query to clear quota flag if it was false-positively set or has reset
    const probeQuota = async () => {
      try {
        console.log("Probing database quota...");
        const q = query(collection(db, 'posts'), limit(1));
        await getDocs(q);
        console.log("Database probe successful.");
        setQuotaExceeded(false);
      } catch (err: any) {
        console.error("Database probe error:", err.code, err.message);
        if (err?.code === 'resource-exhausted') {
          setQuotaExceeded(true);
        } else if (err?.code === 'permission-denied') {
          setQuotaExceeded(false);
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
      updateProfileOptimistically
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

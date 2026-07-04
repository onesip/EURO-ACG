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

  const fetchProfile = async (uid: string, currentUser?: User | null) => {
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
        const finalUser = currentUser || auth.currentUser;
        const newProfile: UserProfile = {
          uid,
          displayName: finalUser?.displayName || '二次元同好',
          photoURL: finalUser?.photoURL || '',
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

    let isMounted = true;

    // 0. Check storage availability
    try {
      const testKey = '__test_storage__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      console.warn("Storage is blocked, auth might fail.");
      if (isMounted) {
        alert("⚠️ 浏览器安全限制提示:\n您的浏览器禁用了本地存储或 Cookie。这会阻止 Google 登录后的状态同步。\n\n💡 建议: 请尝试在系统自带浏览器(如 Safari/Chrome)中打开，并关闭「阻止所有 Cookie」选项。");
      }
    }

    // 1. Register auth state observer IMMEDIATELY
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!isMounted) return;
      
      console.log("Auth State Changed:", currentUser?.email || "Guest");
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // 2. Handle redirect result in parallel
    getRedirectResult(auth).then((result) => {
      if (result && isMounted) {
        console.log("Redirect login success:", result.user.email);
      }
    }).catch((err: any) => {
      console.error("Redirect Login Error:", err);
      if (err.code && err.code !== 'auth/no-current-user' && isMounted) {
        alert(`登录重定向出错 (Redirect Error): ${err.message}\n\n💡 建议: 请确保您的域名已在 Firebase 控制台授权，并尝试在纯净浏览器环境(非微信内部)打开。`);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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

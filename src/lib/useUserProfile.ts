import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '../types';
import { loadFromCache, saveToCache } from './cache';

// In-memory cache to avoid redundant network reads or state updates during a session
const memoryCache: Record<string, { profile: UserProfile; timestamp: number }> = {};
const fetchPromises: Record<string, Promise<UserProfile | null>> = {};
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes TTL

export function useUserProfile(uid: string | undefined, fallbackName: string = '', fallbackPhoto: string = '') {
  const [profile, setProfile] = useState<{ displayName: string; photoURL: string; gender?: string; role?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }

    const loadProfile = async () => {
      const now = Date.now();
      
      // 1. Memory Cache
      if (memoryCache[uid] && (now - memoryCache[uid].timestamp < CACHE_TTL)) {
        setProfile({
          displayName: memoryCache[uid].profile.displayName || fallbackName,
          photoURL: memoryCache[uid].profile.photoURL || fallbackPhoto,
          gender: memoryCache[uid].profile.gender,
          role: memoryCache[uid].profile.role,
        });
        return;
      }

      // 2. LocalStorage Cache
      const cached = loadFromCache<UserProfile>(`cached_user_profile_${uid}`);
      if (cached) {
        memoryCache[uid] = { profile: cached, timestamp: now };
        setProfile({
          displayName: cached.displayName || fallbackName,
          photoURL: cached.photoURL || fallbackPhoto,
          gender: cached.gender,
          role: cached.role,
        });
        return;
      }

      // 3. Firestore (de-duplicated)
      setLoading(true);
      try {
        if (!fetchPromises[uid]) {
          fetchPromises[uid] = (async () => {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              const data = userDoc.data() as UserProfile;
              saveToCache(`cached_user_profile_${uid}`, data, CACHE_TTL);
              memoryCache[uid] = { profile: data, timestamp: Date.now() };
              return data;
            }
            return null;
          })();
        }

        const data = await fetchPromises[uid];
        if (data) {
          setProfile({
            displayName: data.displayName || fallbackName,
            photoURL: data.photoURL || fallbackPhoto,
            gender: data.gender,
            role: data.role,
          });
        } else {
          setProfile({
            displayName: fallbackName || 'Moyu Resident',
            photoURL: fallbackPhoto,
          });
        }
      } catch (err) {
        console.error('Error fetching user profile for dynamic render:', err);
        setProfile({
          displayName: fallbackName || 'Moyu Resident',
          photoURL: fallbackPhoto,
        });
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [uid, fallbackName, fallbackPhoto]);

  return { profile, loading };
}

// Function to clear cached profile when user updates their own profile
export function clearProfileCache(uid: string) {
  try {
    delete memoryCache[uid];
    delete fetchPromises[uid];
    localStorage.removeItem(`cached_user_profile_${uid}`);
    localStorage.removeItem(`gender_${uid}`);
  } catch (err) {
    console.error('Error clearing profile cache:', err);
  }
}

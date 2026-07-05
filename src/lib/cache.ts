/**
 * Utility to serialize and deserialize items containing Firestore Timestamps.
 * Restores `.toMillis()` and `.toDate()` methods when loaded from cache.
 */

interface CachedTimestamp {
  seconds: number;
  nanoseconds: number;
}

export function restoreTimestamps<T>(data: any): T {
  if (data === null || data === undefined) return data;

  if (Array.isArray(data)) {
    return data.map(item => restoreTimestamps(item)) as any;
  }

  if (typeof data === 'object') {
    const obj = { ...data };
    
    // Check if it is a Firestore Timestamp representation
    if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
      const t = obj as CachedTimestamp;
      const millis = t.seconds * 1000 + Math.floor(t.nanoseconds / 1000000);
      return {
        seconds: t.seconds,
        nanoseconds: t.nanoseconds,
        toMillis: () => millis,
        toDate: () => new Date(millis),
      } as any;
    }

    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        obj[key] = restoreTimestamps(obj[key]);
      }
    }
    return obj as T;
  }

  return data;
}

export function saveToCache(key: string, data: any, ttlMs: number = 300000): void {
  try {
    const payload = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    // If quota exceeded, clean up cached user profiles and other transient cached data to make room
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cached_') || k.startsWith('gender_') || k.startsWith('user_friends_list_'))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
      
      // Try saving once more
      const payload = {
        data,
        expiresAt: Date.now() + ttlMs,
      };
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (retryError) {
      // Safe fallback if localStorage is still fully saturated or blocked
      console.warn(`Cache write skipped for key ${key} due to persistent storage limits.`);
    }
  }
}

export function loadFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    
    // Check if it's using the new TTL format
    if (parsed && typeof parsed.expiresAt === 'number') {
      if (Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }
      return restoreTimestamps<T>(parsed.data);
    }
    
    // Fallback for old cache formats without TTL
    return restoreTimestamps<T>(parsed);
  } catch (e) {
    console.error(`Failed to load cache for key ${key}:`, e);
    return null;
  }
}

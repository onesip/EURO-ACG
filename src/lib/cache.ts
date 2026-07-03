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

export function saveToCache(key: string, data: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Failed to save cache for key ${key}:`, e);
  }
}

export function loadFromCache<T>(key: string): T | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    return restoreTimestamps<T>(parsed);
  } catch (e) {
    console.error(`Failed to load cache for key ${key}:`, e);
    return null;
  }
}

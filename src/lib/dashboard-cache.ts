// Session storage utilities for caching dashboard data
const CACHE_PREFIX = 'smart-vocab-cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export const sessionStorageCache = {
  set: <T>(key: string, data: T, duration: number = CACHE_DURATION) => {
    if (typeof window === 'undefined') return;
    
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    const timestamp = Date.now();
    const cacheData: CacheData<T> = {
      data,
      timestamp,
      expiry: timestamp + duration,
    };
    
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Failed to cache data in sessionStorage:', error);
    }
  },

  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return null;
      
      const cacheData: CacheData<T> = JSON.parse(cached);
      
      // Check if cache is expired
      if (Date.now() > cacheData.expiry) {
        sessionStorage.removeItem(cacheKey);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      console.warn('Failed to retrieve cached data from sessionStorage:', error);
      return null;
    }
  },

  clear: (key?: string) => {
    if (typeof window === 'undefined') return;
    
    if (key) {
      const cacheKey = `${CACHE_PREFIX}-${key}`;
      sessionStorage.removeItem(cacheKey);
    } else {
      // Clear all cache
      const keys = Object.keys(sessionStorage);
      keys.forEach(k => {
        if (k.startsWith(CACHE_PREFIX)) {
          sessionStorage.removeItem(k);
        }
      });
    }
  },

  isExpired: (key: string): boolean => {
    if (typeof window === 'undefined') return true;
    
    const cacheKey = `${CACHE_PREFIX}-${key}`;
    
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (!cached) return true;
      
      const cacheData: CacheData<unknown> = JSON.parse(cached);
      return Date.now() > cacheData.expiry;
    } catch {
      return true;
    }
  }
};
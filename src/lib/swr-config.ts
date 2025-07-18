import useSWR from 'swr';

// SWR fetcher function
export const fetcher = async (url: string) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    throw new Error('Failed to fetch data');
  }
  
  const data = await res.json();
  
  if (!data.success) {
    throw new Error(data.error || 'API request failed');
  }
  
  return data.data;
};

// SWR configuration presets - optimized for learning session-based updates
export const swrConfig = {
  // Dashboard data - long cache since updates happen via mutate() on session completion
  dashboard: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 12 * 60 * 60 * 1000, // 12 hours deduping
    refreshInterval: 0, // No automatic refresh
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  },
  
  // Profile data - medium cache as settings may change occasionally
  profile: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2 * 60 * 60 * 1000, // 2 hours deduping
    refreshInterval: 0,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  },
  
  // Daily progress - medium cache, updated via mutate() on session completion
  dailyProgress: {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 2 * 60 * 60 * 1000, // 2 hours deduping
    refreshInterval: 0,
    errorRetryCount: 3,
    errorRetryInterval: 1000,
  }
};

// Custom hooks for different data types
export const useDashboardData = () => {
  return useSWR('/api/dashboard', fetcher, swrConfig.dashboard);
};

export const useProfileData = () => {
  return useSWR('/api/user/profile', fetcher, swrConfig.profile);
};

export const useDailyProgress = () => {
  return useSWR('/api/progress/daily', fetcher, swrConfig.dailyProgress);
};

// Progress page specific hooks - optimized for learning session-based updates
export const useAnalyticsData = () => {
  return useSWR('/api/progress/analytics', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 12 * 60 * 60 * 1000, // 12 hours deduping (updated via mutate() on session completion)
    refreshInterval: 0,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  });
};

export const useStrugglingWords = () => {
  return useSWR('/api/progress/struggling-words', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 12 * 60 * 60 * 1000, // 12 hours deduping (updated via mutate() on session completion)
    refreshInterval: 0,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  });
};

export const useLearningHistory = (year?: number, month?: number) => {
  const key = year && month ? `/api/progress/learning-history?year=${year}&month=${month}` : null;
  return useSWR(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 12 * 60 * 60 * 1000, // 12 hours deduping (history data changes rarely)
    refreshInterval: 0,
    errorRetryCount: 2,
    errorRetryInterval: 1000,
  });
};
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth_context';
import { apiService, UserProgress, Module } from '@/services/api';

// Client-side cache for instantaneous sub-second dashboard rendering
let cachedModules: Module[] = [];
let cachedProgress: Record<string, UserProgress> = {};

export function useUserProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(() => {
    if (user) {
      if (cachedProgress[user.id]) return cachedProgress[user.id];
      const stored = localStorage.getItem(`cached_progress_${user.id}`);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return null;
  });
  const [modules, setModules] = useState<Module[]>(() => {
    if (cachedModules.length > 0) return cachedModules;
    const stored = localStorage.getItem('cached_modules');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (authLoading) return true;
    if (!user) return false;
    // Load instantly if we already have cache for modules and this user's progress
    const hasModules = cachedModules.length > 0 || !!localStorage.getItem('cached_modules');
    const hasProgress = !!cachedProgress[user.id] || !!localStorage.getItem(`cached_progress_${user.id}`);
    return !(hasModules && hasProgress);
  });
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useRef(0);
  const isFetching = useRef(false);

  // Sync state if user finishes loading or changes
  useEffect(() => {
    if (user) {
      const p = cachedProgress[user.id] || (() => {
        const stored = localStorage.getItem(`cached_progress_${user.id}`);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch (e) {}
        }
        return null;
      })();
      
      const m = cachedModules.length > 0 ? cachedModules : (() => {
        const stored = localStorage.getItem('cached_modules');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
          } catch (e) {}
        }
        return [];
      })();

      if (p) {
        setProgress(p);
      }
      if (m.length > 0) {
        setModules(m);
        if (p) {
          setLoading(false);
        }
      }
    }
  }, [user?.id, authLoading]);

  useEffect(() => {
    let active = true;
    const timeoutId = setTimeout(() => {
      if (active && loading) {
        setError('The training data is taking a moment to load. This usually happens when the database is starting up.');
      }
    }, 10000);

    async function loadData() {
      if (authLoading) return;
      if (!user) {
        if (active) setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      if (isFetching.current) return;
      isFetching.current = true;

      try {
        console.log(`[useUserProgress] Fetching data (Attempt ${fetchCount.current + 1})`);
        
        // Fetch Modules and User Progress in parallel for speed
        const [fetchedModules, fetchedProgress] = await Promise.all([
          apiService.getModules(),
          apiService.getUser(user.id)
        ]);

        if (active) {
          setModules(fetchedModules);
          setProgress(fetchedProgress);
          setError(null);
          setLoading(false);
          
          // Seed the fast static caches memory
          cachedModules = fetchedModules;
          cachedProgress[user.id] = fetchedProgress;
          try {
            localStorage.setItem('cached_modules', JSON.stringify(fetchedModules));
          } catch (e) {
            console.warn('Failed to cache modules payload:', e);
          }
          try {
            localStorage.setItem(`cached_progress_${user.id}`, JSON.stringify(fetchedProgress));
          } catch (e) {
            console.warn('Failed to cache user progress payload:', e);
          }
        }
      } catch (err: any) {
        console.error('Error loading data in useUserProgress:', err.message || err);
        
        if (active) {
          fetchCount.current += 1;
          // Only retry a few times
          if (fetchCount.current < 3 && (err.message === 'Failed to fetch' || err.name === 'TypeError' || err.status === 503)) {
            console.log(`Retry attempt ${fetchCount.current} in 3 seconds...`);
            setTimeout(() => {
              if (active) {
                isFetching.current = false;
                loadData();
              }
            }, 3000);
            return;
          }
          // If we already have cached data, don't show full-screen error blocking the user
          if (cachedModules.length > 0 || localStorage.getItem('cached_modules')) {
            console.warn('API error encountered, but using cached copy for user safety.');
            setError(null);
          } else {
            setError(err.message || 'Unable to connect to the training server. Please check your connection and refresh.');
          }
          setLoading(false);
        }
      } finally {
        isFetching.current = false;
        clearTimeout(timeoutId);
      }
    }

    loadData();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [user?.id, authLoading]); // Dependency on user.id is more stable

  const updateProgress = async (newIndex: number) => {
    if (!user || !progress) return;

    // Only update if it's an advancement
    if (newIndex <= progress.unlockedModuleIndex) return;

    // Optimistically update instantly for maximum responsiveness and offline reliability
    const isLast = newIndex >= modules.length;
    const updates = {
      unlockedModuleIndex: newIndex,
      completed: isLast,
      completedAt: isLast ? new Date().toISOString() : undefined,
    };
    
    // Update local state and static cache instantly
    const updatedProgress = { ...progress, ...updates };
    setProgress(updatedProgress);
    cachedProgress[user.id] = updatedProgress;
    try {
      localStorage.setItem(`cached_progress_${user.id}`, JSON.stringify(updatedProgress));
    } catch (e) {
      console.warn('Failed to cache progress to localStorage inside updateProgress:', e);
    }

    try {
      await apiService.updateProgress(user.id, updates);
    } catch (err) {
      console.error('Failed to update progress on server:', err);
    }
  };

  return { progress, modules, loading, error, updateProgress };
}

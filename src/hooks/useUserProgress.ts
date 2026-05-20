import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth_context';
import { apiService, UserProgress, Module } from '@/services/api';

export function useUserProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCount = useRef(0);
  const isFetching = useRef(false);

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
          setError(err.message || 'Unable to connect to the training server. Please check your connection and refresh.');
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

    try {
      const isLast = newIndex >= modules.length;
      const updates = {
        unlockedModuleIndex: newIndex,
        completed: isLast,
        completedAt: isLast ? new Date().toISOString() : undefined,
      };
      
      await apiService.updateProgress(user.id, updates);
      
      // Update local state
      setProgress(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  return { progress, modules, loading, error, updateProgress };
}

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth_context';
import { apiService, UserProgress, Module } from '@/services/api';

export function useUserProgress() {
  const { user, loading: authLoading } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (authLoading) return;
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Fetch Modules and User Progress in parallel
        const [fetchedModules, fetchedProgress] = await Promise.all([
          apiService.getModules(),
          apiService.getUser(user.id)
        ]);

        setModules(fetchedModules);
        setProgress(fetchedProgress);
      } catch (err: any) {
        console.error('Error loading data:', err);
        setError(err.message || 'Failed to load your training data.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user, authLoading]);

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

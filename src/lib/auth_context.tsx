import { useState, useEffect, createContext, useContext } from 'react';
import { apiService } from '@/services/api';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cached_user');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return null;
  });
  
  const [loading, setLoading] = useState(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      const cached = localStorage.getItem('cached_user');
      if (token && cached) {
        return false; // Load instantly using cache
      }
    }
    return true;
  });

  const refreshUser = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setUser(null);
      localStorage.removeItem('cached_user');
      setLoading(false);
      return;
    }
    
    try {
      const userData = await apiService.callBackend('/auth/me');
      setUser(userData);
      try {
        localStorage.setItem('cached_user', JSON.stringify(userData));
      } catch (e) {
        console.warn('Failed to stringify/cache user to localStorage:', e);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      // Only clear user if it's an auth error, not a network/server error
      if ((err as Error).message.includes('Unauthorized') || (err as Error).message.includes('token')) {
        setUser(null);
        localStorage.removeItem('cached_user');
        localStorage.removeItem('auth_token');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const logout = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('cached_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser, setUser: (newUser: User | null) => {
      setUser(newUser);
      if (newUser) {
        try {
          localStorage.setItem('cached_user', JSON.stringify(newUser));
        } catch (e) {
          console.warn('Failed to stringify/cache user in sset: ', e);
        }
      } else {
        localStorage.removeItem('cached_user');
      }
    } }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

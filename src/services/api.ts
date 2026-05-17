import { Module, UserProgress, ModuleType } from '@/types';

export { ModuleType };
export type { Module, UserProgress };

const API_BASE = '/api';

function getHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

export const apiService = {
  // Auth
  async login(credentials: any): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Login failed');
    }
    return res.json();
  },

  async signup(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Signup failed');
    }
    return res.json();
  },

  // Modules
  async getModules(): Promise<Module[]> {
    const res = await fetch(`${API_BASE}/modules`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch modules');
    }
    return res.json();
  },

  async createModule(module: Partial<Module>): Promise<void> {
    const res = await fetch(`${API_BASE}/modules`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(module),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to create module');
    }
  },

  async updateModule(id: string, module: Partial<Module>): Promise<void> {
    const res = await fetch(`${API_BASE}/modules/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(module),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update module');
    }
  },

  async deleteModule(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/modules/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to delete module');
    }
  },

  // Users
  async getUser(id: string): Promise<UserProgress> {
    const res = await fetch(`${API_BASE}/users/${id}`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch user');
    }
    return res.json();
  },

  async ensureUser(user: { id: string; email: string | null; displayName: string | null; photoUrl: string | null }): Promise<void> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to ensure user');
    }
  },

  async updateProgress(id: string, progress: Partial<UserProgress>): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}/progress`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(progress),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update progress');
    }
  },

  async updateProfile(id: string, profile: { displayName: string; photoUrl: string }): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}/profile`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(profile),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update profile');
    }
  },

  async updatePassword(id: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE}/users/${id}/password`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to update password');
    }
  },

  async getAdminUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || 'Failed to fetch users');
    }
    return res.json();
  },

  // Admin
  async checkAdmin(email: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admins/${email}`, { headers: getHeaders() });
    if (!res.ok) return false;
    const data = await res.json();
    return data.isAdmin;
  }
};

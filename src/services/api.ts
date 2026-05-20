import { Module, UserProgress, ModuleType } from '@/types';

export { ModuleType };
export type { Module, UserProgress };
const API_URL = '/api';

export const apiService = {
  // Helper for calling the backend API directly
  async callBackend(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any;

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${cleanEndpoint}`;
    
    // Server-side calls (SSR/Node) need absolute URL if used
    const fetchUrl = typeof window === 'undefined' ? `http://localhost:3000${url}` : url;
    
    if (typeof window !== 'undefined') {
      console.log(`[API] Fetching ${fetchUrl}`);
    }
    
    // Add a 90-second timeout to fetch requests
    const controller = new AbortController();
    const id = setTimeout(() => {
      console.warn(`[API] Timeout reached for ${fetchUrl} (90s)`);
      controller.abort();
    }, 90000);

    try {
      const response = await fetch(fetchUrl, {
        ...options,
        headers,
        signal: controller.signal
      });
      clearTimeout(id);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || 'API call failed');
      }

      return response.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`[API Timeout] Request to ${fetchUrl} timed out after 90s`);
        throw new Error('The request is taking too long. The server might be warming up, please wait a moment.');
      }
      console.error(`[API Error] Request to ${fetchUrl} failed:`, err.message);
      throw err;
    }
  },

  // Auth
  async login(email: string, password: string) {
    const data = await this.callBackend('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async signup(email: string, password: string, displayName: string) {
    const data = await this.callBackend('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    });
    localStorage.setItem('auth_token', data.token);
    return data;
  },

  async logout() {
    localStorage.removeItem('auth_token');
  },

  // Modules
  async getModules(): Promise<Module[]> {
    return this.callBackend('/modules');
  },

  async createModule(module: Partial<Module>): Promise<void> {
    await this.callBackend('/modules', {
      method: 'POST',
      body: JSON.stringify(module)
    });
  },

  async updateModule(id: string, module: Partial<Module>): Promise<void> {
    await this.callBackend(`/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(module)
    });
  },

  async deleteModule(id: string): Promise<void> {
    await this.callBackend(`/modules/${id}`, {
      method: 'DELETE'
    });
  },

  // Users
  async getUser(id: string): Promise<UserProgress> {
    return this.callBackend(`/users/${id}`);
  },

  async updateProgress(id: string, progress: Partial<UserProgress>): Promise<void> {
    await this.callBackend(`/users/${id}/progress`, {
      method: 'PUT',
      body: JSON.stringify(progress)
    });
  },

  async updateProfile(id: string, profile: { displayName: string; photoUrl: string }): Promise<void> {
    await this.callBackend(`/users/${id}/profile`, {
      method: 'PUT',
      body: JSON.stringify(profile)
    });
  },

  async updatePassword(id: string, password: string): Promise<void> {
    await this.callBackend(`/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password })
    });
  },

  async getAdminUsers(): Promise<any[]> {
    return this.callBackend('/admin/users');
  },

  // Admin
  async checkAdmin(email: string): Promise<boolean> {
    const data = await this.callBackend(`/admins/${email}`);
    return data.isAdmin;
  }
};

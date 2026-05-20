import { Module, UserProgress, ModuleType } from '@/types';

export { ModuleType };
export type { Module, UserProgress };
const API_URL = '/api';

// Helper to extract the actual origin under all conditions (including sandboxed iframe opaque origins and blob: URLs)
function extractHttpOrigin(str: any): string | null {
  if (!str || typeof str !== 'string') return null;
  // Regex to match protocol + domain. Will match inside blob:http://... or normal http://...
  const match = str.match(/https?:\/\/[^\/]+/i);
  return match ? match[0] : null;
}

let detectedOrigin = '';
try {
  if (typeof window !== 'undefined') {
    // 1. Try process.env.APP_URL if defined on process.env (Vite define)
    if (typeof process !== 'undefined' && process.env && process.env.APP_URL) {
      const origin = extractHttpOrigin(process.env.APP_URL);
      if (origin) detectedOrigin = origin;
    }
    
    // 2. Try import.meta.url (extremely reliable in production as it points to container asset host, supports blob: URLs)
    if (!detectedOrigin && import.meta.url) {
      const origin = extractHttpOrigin(import.meta.url);
      if (origin) detectedOrigin = origin;
    }

    // 3. Try window.location.href (very reliable for sandboxed/non-sandboxed iframe URLs to extract the real domain)
    if (!detectedOrigin && window.location && window.location.href) {
      const origin = extractHttpOrigin(window.location.href);
      if (origin && !origin.startsWith('https://ai.studio') && !origin.startsWith('https://aistudio.google.com')) {
        detectedOrigin = origin;
      }
    }
    
    // 4. Try document.referrer (points to parent page host that embeds the iframe, ignore AIS platform hosts)
    if (!detectedOrigin && document.referrer) {
      const refOrig = extractHttpOrigin(document.referrer);
      if (refOrig) {
        try {
          const refUrl = new URL(refOrig);
          const refHost = refUrl.hostname.toLowerCase();
          const isAISPlatform = refHost.endsWith('google.com') || 
                                refHost.endsWith('google.dev') || 
                                refHost.endsWith('ai.studio') || 
                                refHost.endsWith('google.app') ||
                                refHost === 'ai.studio';
          if (!isAISPlatform) {
            detectedOrigin = refUrl.origin;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 5. Try window.location.origin fallback
    if (!detectedOrigin && window.location.origin && window.location.origin !== 'null') {
      detectedOrigin = window.location.origin;
    }
  }
} catch (e) {
  console.warn('[API] Origin detection failed:', e);
}

export const apiService = {
  // Helper for calling the backend API directly
  async callBackend(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token');
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as any;

    if (token) {
      const cleanToken = token.trim().replace(/[\r\n\t]/g, '');
      if (cleanToken && cleanToken !== 'undefined' && cleanToken !== 'null') {
        headers['Authorization'] = `Bearer ${cleanToken}`;
      }
    }

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${API_URL}${cleanEndpoint}`;
    
    // Server-side calls (SSR/Node) need absolute localhost URL, client-side uses absolute URL if detected, otherwise fallback to import.meta.url host
    let rawFetchUrl = '';
    if (typeof window === 'undefined') {
      rawFetchUrl = `http://localhost:3000${url}`;
    } else {
      let base = detectedOrigin;
      if (!base && window.location.origin && window.location.origin !== 'null') {
        base = window.location.origin;
      }
      
      // Ultimate absolute fallback from import.meta.url if base is still empty/about:/null
      if (!base || base.startsWith('about:') || base === 'null') {
        try {
          if (import.meta.url) {
            const origin = extractHttpOrigin(import.meta.url);
            if (origin) base = origin;
          }
        } catch (e) {
          // ignore
        }
      }

      if (base && !base.startsWith('about:') && base !== 'null') {
        rawFetchUrl = `${base}${url}`;
      } else {
        rawFetchUrl = url;
      }
    }

    const fetchUrl = rawFetchUrl.trim().replace(/[\r\n\t]/g, '');
    
    if (typeof window !== 'undefined') {
      console.log(`[API] Fetching ${fetchUrl}`);
    }
    
    try {
      const response = await fetch(fetchUrl, {
        ...options,
        headers
      });

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

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './lib/auth_context.tsx';

// Only register Service Worker in production mode to avoid development caching and sandboxed iframe issues
const shouldRegisterSW = () => {
  if (typeof window === 'undefined') return false;
  if (!('serviceWorker' in navigator)) return false;
  
  // Do not register inside sandboxed iframes (origin is 'null') or about:blank
  if (window.location.origin === 'null' || window.location.protocol === 'about:') return false;
  
  // Do not register inside cross-origin/sandboxed iframes
  try {
    if (window.self !== window.top) {
      return false;
    }
  } catch (e) {
    return false;
  }
  
  return true;
};

if (import.meta.env.PROD && shouldRegisterSW()) {
  try {
    registerSW({ immediate: true });
  } catch (err) {
    console.warn('[SW] Registration failed:', err);
  }
} else if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((success) => {
          if (success) {
            console.log('[SW] Successfully unregistered stale service worker.');
          }
        }).catch(() => {});
      }
    }).catch((err) => {
      console.warn('[SW] Failed to fetch registrations:', err);
    });
  } catch (err) {
    console.warn('[SW] Unregister failed:', err);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

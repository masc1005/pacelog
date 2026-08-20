import { createAuthClient } from 'better-auth/client';

const isBrowser = typeof window !== 'undefined';
const isLocalhost =
  isBrowser &&
  (window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname.startsWith('192.168.'));

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalhost
    ? `http://${isBrowser ? window.location.hostname : 'localhost'}:3333`
    : 'https://pacelog-api-production.up.railway.app');

export const TOKEN_KEY = 'pacelog_auth_token';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    // Injeta token Bearer em todas as requisições para funcionar em ambientes
    // cross-origin onde cookies SameSite=None são bloqueados (Safari ITP, etc.)
    onRequest: (ctx) => {
      if (isBrowser) {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
          ctx.headers.set('Authorization', `Bearer ${token}`);
        }
      }
    },
  },
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

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



export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
});

export const { signIn, signUp, signOut, useSession, getSession } = authClient;

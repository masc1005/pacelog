import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authClient } from '../lib/authClient';
import { dbPurgeUser } from '../pwa/services/indexedDb.service';

export const TOKEN_KEY = 'pacelog_auth_token';
export const USER_CACHE_KEY = 'pacelog_user_cache';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
}

export function cacheUser(user: AuthUser) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
    }
  } catch {
    // ignora falha de armazenamento
  }
}

export function getCachedUser(): AuthUser | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function persistToken(resData: any) {
  try {
    if (typeof localStorage === 'undefined') return;
    const token =
      resData?.token ||
      resData?.session?.token ||
      resData?.session?.id ||
      'active';
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignora falha de armazenamento
  }
}

export function clearUserCache() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(USER_CACHE_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignora falha
  }
}

export interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window !== 'undefined') {
      return getCachedUser();
    }
    return null;
  });
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    const hasToken = typeof window !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);
    const cachedUser = typeof window !== 'undefined' ? getCachedUser() : null;
    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

    // Se estiver offline e houver dados em cache/token, restaura a sessão localmente sem tentar rede
    if (isOffline && (hasToken || cachedUser)) {
      if (cachedUser) {
        setUser(cachedUser);
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await authClient.getSession();
      if (res?.data?.user) {
        const authUser = res.data.user as AuthUser;
        setUser(authUser);
        setSession(res.data.session ?? null);
        cacheUser(authUser);
        persistToken(res.data);
      } else {
        // Sessão inválida ou expirada no servidor
        setUser(null);
        setSession(null);
        clearUserCache();
      }
    } catch {
      // Falha de rede: se há token ou cache salvo, mantém o usuário offline
      if (hasToken || cachedUser) {
        if (cachedUser) {
          setUser(cachedUser);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Revalidar sessão silenciosamente quando o dispositivo voltar a ficar online
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      fetchSession();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [fetchSession]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      const res = await authClient.signIn.email({
        email,
        password,
      });

      if (res?.error) {
        return { error: res.error.message || 'Falha ao autenticar com as credenciais informadas.' };
      }

      if (res?.data?.user) {
        const authUser = res.data.user as AuthUser;
        setUser(authUser);
        setSession((res.data as any)?.session ?? null);
        cacheUser(authUser);
        persistToken(res.data);
        setIsLoading(false);
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Erro de conexão com o servidor de autenticação.' };
    }
  };

  const handleSignUp = async (name: string, email: string, password: string) => {
    try {
      const res = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (res?.error) {
        return { error: res.error.message || 'Não foi possível cadastrar a conta de atleta.' };
      }

      if (res?.data?.user) {
        const authUser = res.data.user as AuthUser;
        setUser(authUser);
        setSession((res.data as any)?.session ?? null);
        cacheUser(authUser);
        persistToken(res.data);
        setIsLoading(false);
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Erro de conexão ao criar conta.' };
    }
  };

  const handleSignOut = async () => {
    const currentUserId = user?.id || getCachedUser()?.id;
    try {
      await authClient.signOut();
    } catch {
      // Silencioso em caso de erro de rede durante logout offline
    } finally {
      clearUserCache();
      setUser(null);
      setSession(null);

      // Purgar dados offline do usuário antes de limpar o estado
      if (currentUserId) {
        await dbPurgeUser(currentUserId).catch(() => {
          // silencioso — não bloquear o logout se o IndexedDB falhar
        });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        refreshSession: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}


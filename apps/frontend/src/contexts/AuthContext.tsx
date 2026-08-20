import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authClient } from '../lib/authClient';


export interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  emailVerified?: boolean;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await authClient.getSession();
      if (res?.data?.user) {
        setUser(res.data.user as AuthUser);
        setSession(res.data.session ?? null);
      } else {
        setUser(null);
        setSession(null);
      }
    } catch {
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
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
        setUser(res.data.user as AuthUser);
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
        setUser(res.data.user as AuthUser);
        setIsLoading(false);
      }

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Erro de conexão ao criar conta.' };
    }
  };

  const handleSignOut = async () => {
    try {
      await authClient.signOut();
    } finally {
      setUser(null);
      setSession(null);
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

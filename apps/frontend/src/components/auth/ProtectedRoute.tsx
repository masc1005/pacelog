import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, TOKEN_KEY, getCachedUser } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
  const hasToken = typeof localStorage !== 'undefined' && !!localStorage.getItem(TOKEN_KEY);
  const hasCachedUser = !!getCachedUser();

  // Enquanto a sessão está sendo validada online e há token/cache, exibir loader tático
  if (isLoading && (hasToken || hasCachedUser)) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center gap-4 text-white font-mono">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#00F0FF]" />
          <div className="absolute inset-0 rounded-full blur-md bg-[#00F0FF]/30" />
        </div>
        <p className="text-xs uppercase tracking-widest text-gray-400 animate-pulse">
          Validando credenciais do atleta...
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center gap-4 text-white font-mono">
        <div className="relative flex items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#00F0FF]" />
          <div className="absolute inset-0 rounded-full blur-md bg-[#00F0FF]/30" />
        </div>
        <p className="text-xs uppercase tracking-widest text-gray-400 animate-pulse">
          Validando credenciais do atleta...
        </p>
      </div>
    );
  }

  // Se estiver offline e houver usuário autenticado (ou cache/token salvo), permite acesso
  if (isOffline && (user || hasCachedUser || hasToken)) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

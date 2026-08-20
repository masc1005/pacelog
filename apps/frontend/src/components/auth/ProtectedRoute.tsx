import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const TOKEN_KEY = 'pacelog_auth_token';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Enquanto a sessão está sendo validada, verificar se há token salvo
  // para evitar redirect prematuro (race condition cross-origin)
  const hasToken = !!localStorage.getItem(TOKEN_KEY);

  if (isLoading && hasToken) {
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

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

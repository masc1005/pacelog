import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextType {
  toast: (message: string, variant?: ToastVariant) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICON_MAP = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
};

const COLOR_MAP = {
  success: { bg: '#0D2B1A', border: '#D4F684', icon: '#D4F684', text: '#D4E4FA' },
  error: { bg: '#2B0D0D', border: '#FFB4AB', icon: '#FFB4AB', text: '#D4E4FA' },
  warning: { bg: '#2B1F0D', border: '#FFB800', icon: '#FFB800', text: '#D4E4FA' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev.slice(-2), { id, message, variant }]);
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{
      toast: addToast,
      success: (m) => addToast(m, 'success'),
      error: (m) => addToast(m, 'error'),
      warning: (m) => addToast(m, 'warning'),
    }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[92vw] max-w-sm pointer-events-none">
        {toasts.map(t => {
          const colors = COLOR_MAP[t.variant];
          const Icon = ICON_MAP[t.variant];
          return (
            <div
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-[2px] border shadow-xl"
              style={{ background: colors.bg, borderColor: colors.border }}
            >
              <Icon className="h-4 w-4 flex-shrink-0" style={{ color: colors.icon }} />
              <span className="font-mono text-xs flex-1" style={{ color: colors.text }}>{t.message}</span>
              <button onClick={() => removeToast(t.id)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5" style={{ color: colors.text }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de um ToastProvider');
  return ctx;
}

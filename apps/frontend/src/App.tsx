import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { SyncQueueProvider } from './pwa/hooks/useSyncQueue';
import { OfflineBanner } from './pwa/components/OfflineBanner';
import { ConflictResolverModal } from './pwa/components/ConflictResolverModal';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { AppRoutes } from './routes';

/**
 * Componente intermediário que lê o userId do AuthContext e o repassa
 * ao SyncQueueProvider, evitando usar hooks fora de providers.
 */
function SyncQueueBridge({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <SyncQueueProvider userId={user?.id ?? null}>
      {children}
    </SyncQueueProvider>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <SettingsProvider>
              <SyncQueueBridge>
                <AppRoutes />
                <OfflineBanner />
                <ConflictResolverModal />
              </SyncQueueBridge>
            </SettingsProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

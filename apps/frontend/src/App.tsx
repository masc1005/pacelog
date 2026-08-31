import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SettingsProvider>
            <AppRoutes />
          </SettingsProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

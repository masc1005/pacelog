import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import * as AuthContextModule from '../../contexts/AuthContext';

describe('ProtectedRoute Offline & Guard Tests', () => {
  const storageMap = new Map<string, string>();
  const localStorageMock: Storage = {
    getItem: vi.fn((key: string) => storageMap.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      storageMap.set(key, String(value));
    }),
    removeItem: vi.fn((key: string) => {
      storageMap.delete(key);
    }),
    clear: vi.fn(() => {
      storageMap.clear();
    }),
    key: vi.fn((i: number) => Array.from(storageMap.keys())[i] ?? null),
    get length() {
      return storageMap.size;
    },
  };

  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal('localStorage', localStorageMock);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deve permitir acesso ao conteúdo protegido se estiver offline e houver usuário em cache', () => {
    vi.stubGlobal('navigator', { onLine: false });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: {
        id: 'user_123',
        name: 'Atleta Offline',
        email: 'atleta@offline.app',
      },
      session: null,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div id="protected-content">PAINEL DO ATLETA</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('PAINEL DO ATLETA');
  });

  it('não deve renderizar conteúdo protegido e deve redirecionar se online e sem usuário autenticado', () => {
    vi.stubGlobal('navigator', { onLine: true });

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div id="protected-content">PAINEL DO ATLETA</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div id="login-page">TELA DE LOGIN</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Em SSR (renderToString), <Navigate /> não renderiza o componente protegido
    expect(html).not.toContain('PAINEL DO ATLETA');
  });

  it('deve permitir acesso offline se houver token salvo mesmo sem objeto user carregado', () => {
    vi.stubGlobal('navigator', { onLine: false });
    storageMap.set(AuthContextModule.TOKEN_KEY, 'saved-token-abc');

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div id="protected-content">ACESSO OFFLINE LIBERADO</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('ACESSO OFFLINE LIBERADO');
  });

  it('deve exibir loader tático enquanto isLoading estiver ativo e houver token/cache', () => {
    vi.stubGlobal('navigator', { onLine: true });
    storageMap.set(AuthContextModule.TOKEN_KEY, 'saved-token-abc');

    vi.spyOn(AuthContextModule, 'useAuth').mockReturnValue({
      user: null,
      session: null,
      isLoading: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      refreshSession: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div id="protected-content">CONTEÚDO</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('Validando credenciais do atleta...');
    expect(html).not.toContain('CONTEÚDO');
  });
});

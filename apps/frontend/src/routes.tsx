import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { HomePage } from './pages/home/HomePage';
import { Card } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Activity, TrendingUp, Target, User, Plus } from 'lucide-react';

// Placeholders táticos para módulos secundários (serão expandidos nas próximas fases)
const SessionsPlaceholder = () => (
  <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
    <Activity className="h-10 w-10 text-[#00F0FF]" />
    <Badge variant="cyan" size="sm">MÓDULO DE SESSÕES</Badge>
    <h2 className="text-xl font-bold text-white">Histórico Completo de Treinos</h2>
    <p className="text-xs text-gray-400 font-mono max-w-md">
      O motor de listagem, paginação e filtros detalhados está sendo conectado ao backend (Fase B2).
    </p>
  </Card>
);

const NewSessionPlaceholder = () => (
  <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
    <Plus className="h-10 w-10 text-[#39FF14]" />
    <Badge variant="green" size="sm">NOVO REGISTRO</Badge>
    <h2 className="text-xl font-bold text-white">Motor de Registro Adaptativo</h2>
    <p className="text-xs text-gray-400 font-mono max-w-md">
      Wizard dinâmico para os 5 esportes oficiais (Corrida, Boxe, Musculação, Futevôlei e Futebol).
    </p>
  </Card>
);

const ProgressPlaceholder = () => (
  <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
    <TrendingUp className="h-10 w-10 text-[#A855F7]" />
    <Badge variant="purple" size="sm">EVOLUÇÃO & TELEMETRIA</Badge>
    <h2 className="text-xl font-bold text-white">Gráficos de Consistência e Volume</h2>
    <p className="text-xs text-gray-400 font-mono max-w-md">
      Comparativos semanais, mensais e cálculo automático de pace e carga média.
    </p>
  </Card>
);

const GoalsPlaceholder = () => (
  <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
    <Target className="h-10 w-10 text-[#FFB800]" />
    <Badge variant="amber" size="sm">METAS & MARCOS</Badge>
    <h2 className="text-xl font-bold text-white">Metas Táticas Ativas</h2>
    <p className="text-xs text-gray-400 font-mono max-w-md">
      Definição de marcos de quilometragem, tempo, rounds e sessões por período.
    </p>
  </Card>
);

const ProfilePlaceholder = () => (
  <Card className="p-8 text-center flex flex-col items-center justify-center gap-3">
    <User className="h-10 w-10 text-[#00F0FF]" />
    <Badge variant="cyan" size="sm">PERFIL DO ATLETA</Badge>
    <h2 className="text-xl font-bold text-white">Configurações & Esportes</h2>
    <p className="text-xs text-gray-400 font-mono max-w-md">
      Gerenciamento de modalidades ativas, unidades de medida e dados de telemetria.
    </p>
  </Card>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas (Auth) */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      {/* Rotas Protegidas com Layout Principal */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="sessions" element={<SessionsPlaceholder />} />
        <Route path="sessions/new" element={<NewSessionPlaceholder />} />
        <Route path="progress" element={<ProgressPlaceholder />} />
        <Route path="goals" element={<GoalsPlaceholder />} />
        <Route path="profile" element={<ProfilePlaceholder />} />
      </Route>

      {/* Fallback para home ou login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

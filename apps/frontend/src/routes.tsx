import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { OnboardingPage } from './pages/onboarding/OnboardingPage';
import { HomePage } from './pages/home/HomePage';
import { NewSessionPage } from './pages/sessions/NewSessionPage';
import { SessionsPage } from './pages/sessions/SessionsPage';
import { SessionDetailPage } from './pages/sessions/SessionDetailPage';
import { EditSessionPage } from './pages/sessions/EditSessionPage';
import { GoalsPage } from './pages/goals/GoalsPage';
import { CreateGoalPage } from './pages/goals/CreateGoalPage';
import { GoalDetailsPage } from './pages/goals/GoalDetailsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProgressPage } from './pages/progress/ProgressPage';
import { EvolutionBySportPage } from './pages/progress/EvolutionBySportPage';
import { InsightsPage } from './pages/insights/InsightsPage';
import { ShoesPage } from './pages/shoes/ShoesPage';
import { CreateShoePage } from './pages/shoes/CreateShoePage';
import { ShoeDetailsPage } from './pages/shoes/ShoeDetailsPage';
import { EditShoePage } from './pages/shoes/EditShoePage';


export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas (Auth) */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      {/* Redirects de rotas antigas para novas */}
      <Route path="/goals" element={<Navigate to="/progress/goals" replace />} />
      <Route path="/goals/new" element={<Navigate to="/progress/goals/new" replace />} />
      <Route path="/goals/:id" element={<GoalDetailsRedirect />} />
      <Route path="/insights" element={<Navigate to="/progress/insights" replace />} />

      {/* Rotas Protegidas com Layout Principal */}
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />

        {/* Sessões */}
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/new" element={<NewSessionPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="sessions/:id/edit" element={<EditSessionPage />} />

        {/* Progresso — inclui Metas e Insights como subrotas */}
        <Route path="progress" element={<ProgressPage />} />
        <Route path="progress/sports/:sportKey" element={<EvolutionBySportPage />} />
        <Route path="progress/goals" element={<GoalsPage />} />
        <Route path="progress/goals/new" element={<CreateGoalPage />} />
        <Route path="progress/goals/:id" element={<GoalDetailsPage />} />
        <Route path="progress/insights" element={<InsightsPage />} />

        {/* Perfil */}
        <Route path="profile" element={<ProfilePage />} />

        {/* Tênis (Running Shoes Tracker) */}
        <Route path="shoes" element={<ShoesPage />} />
        <Route path="shoes/new" element={<CreateShoePage />} />
        <Route path="shoes/:id" element={<ShoeDetailsPage />} />
        <Route path="shoes/:id/edit" element={<EditShoePage />} />
      </Route>

      {/* Fallback para home ou login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

/**
 * Redirect dinâmico para /goals/:id → /progress/goals/:id
 * Não é possível usar Navigate com params diretamente, então usamos um componente auxiliar.
 */
function GoalDetailsRedirect() {
  // Extrai o id do pathname atual
  const id = window.location.pathname.split('/goals/')[1];
  return <Navigate to={`/progress/goals/${id}`} replace />;
}

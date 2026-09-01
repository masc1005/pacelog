import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { PublicOnlyRoute } from './components/auth/PublicOnlyRoute';

// Carregamento Preguiçoso (Code-Splitting) das Páginas
const LoginPage = React.lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const RegisterPage = React.lazy(() =>
  import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = React.lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({
    default: m.ForgotPasswordPage,
  }))
);
const ResetPasswordPage = React.lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  }))
);
const OnboardingPage = React.lazy(() =>
  import('./pages/onboarding/OnboardingPage').then((m) => ({
    default: m.OnboardingPage,
  }))
);
const HomePage = React.lazy(() =>
  import('./pages/home/HomePage').then((m) => ({ default: m.HomePage }))
);
const NewSessionPage = React.lazy(() =>
  import('./pages/sessions/NewSessionPage').then((m) => ({
    default: m.NewSessionPage,
  }))
);
const SessionsPage = React.lazy(() =>
  import('./pages/sessions/SessionsPage').then((m) => ({
    default: m.SessionsPage,
  }))
);
const SessionDetailPage = React.lazy(() =>
  import('./pages/sessions/SessionDetailPage').then((m) => ({
    default: m.SessionDetailPage,
  }))
);
const EditSessionPage = React.lazy(() =>
  import('./pages/sessions/EditSessionPage').then((m) => ({
    default: m.EditSessionPage,
  }))
);
const GoalsPage = React.lazy(() =>
  import('./pages/goals/GoalsPage').then((m) => ({ default: m.GoalsPage }))
);
const CreateGoalPage = React.lazy(() =>
  import('./pages/goals/CreateGoalPage').then((m) => ({
    default: m.CreateGoalPage,
  }))
);
const GoalDetailsPage = React.lazy(() =>
  import('./pages/goals/GoalDetailsPage').then((m) => ({
    default: m.GoalDetailsPage,
  }))
);
const ProfilePage = React.lazy(() =>
  import('./pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage }))
);
const ProgressPage = React.lazy(() =>
  import('./pages/progress/ProgressPage').then((m) => ({
    default: m.ProgressPage,
  }))
);
const EvolutionBySportPage = React.lazy(() =>
  import('./pages/progress/EvolutionBySportPage').then((m) => ({
    default: m.EvolutionBySportPage,
  }))
);
const InsightsPage = React.lazy(() =>
  import('./pages/insights/InsightsPage').then((m) => ({
    default: m.InsightsPage,
  }))
);
const ShoesPage = React.lazy(() =>
  import('./pages/shoes/ShoesPage').then((m) => ({ default: m.ShoesPage }))
);
const CreateShoePage = React.lazy(() =>
  import('./pages/shoes/CreateShoePage').then((m) => ({
    default: m.CreateShoePage,
  }))
);
const ShoeDetailsPage = React.lazy(() =>
  import('./pages/shoes/ShoeDetailsPage').then((m) => ({
    default: m.ShoeDetailsPage,
  }))
);
const EditShoePage = React.lazy(() =>
  import('./pages/shoes/EditShoePage').then((m) => ({
    default: m.EditShoePage,
  }))
);
const StrengthRoutes = React.lazy(() =>
  import('./features/strength/strength.routes').then((m) => ({
    default: m.StrengthRoutes,
  }))
);
const SettingsPage = React.lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({
    default: m.SettingsPage,
  }))
);

const TacticalPageLoader: React.FC = () => (
  <div
    className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-3 p-8"
    aria-busy="true"
  >
    <div className="w-9 h-9 rounded-lg bg-[#A855F7]/10 border border-[#A855F7]/30 flex items-center justify-center animate-pulse">
      <div className="w-3.5 h-3.5 rounded-full bg-[#A855F7]" />
    </div>
    <span className="font-mono text-xs text-[#8F9380] uppercase tracking-widest animate-pulse">
      Carregando módulo…
    </span>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<TacticalPageLoader />}>
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
        <Route
          path="/forgot-password"
          element={
            <PublicOnlyRoute>
              <ForgotPasswordPage />
            </PublicOnlyRoute>
          }
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />

        {/* Redirects de rotas antigas para novas */}
        <Route path="/goals" element={<Navigate to="/progress/goals" replace />} />
        <Route
          path="/goals/new"
          element={<Navigate to="/progress/goals/new" replace />}
        />
        <Route path="/goals/:id" element={<GoalDetailsRedirect />} />
        <Route
          path="/insights"
          element={<Navigate to="/progress/insights" replace />}
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

          {/* Sessões */}
          <Route path="sessions" element={<SessionsPage />} />
          <Route path="sessions/new" element={<NewSessionPage />} />
          <Route path="sessions/:id" element={<SessionDetailPage />} />
          <Route path="sessions/:id/edit" element={<EditSessionPage />} />

          {/* Progresso — inclui Metas e Insights como subrotas */}
          <Route path="progress" element={<ProgressPage />} />
          <Route
            path="progress/sports/:sportKey"
            element={<EvolutionBySportPage />}
          />
          <Route path="progress/goals" element={<GoalsPage />} />
          <Route path="progress/goals/new" element={<CreateGoalPage />} />
          <Route path="progress/goals/:id" element={<GoalDetailsPage />} />
          <Route path="progress/insights" element={<InsightsPage />} />

          {/* Perfil & Configurações */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />

          {/* Tênis (Running Shoes Tracker) */}
          <Route path="shoes" element={<ShoesPage />} />
          <Route path="shoes/new" element={<CreateShoePage />} />
          <Route path="shoes/:id" element={<ShoeDetailsPage />} />
          <Route path="shoes/:id/edit" element={<EditShoePage />} />

          {/* Musculação */}
          <Route path="strength/*" element={<StrengthRoutes />} />
        </Route>

        {/* Fallback para home ou login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};

/**
 * Redirect dinâmico para /goals/:id → /progress/goals/:id
 */
function GoalDetailsRedirect() {
  const id = window.location.pathname.split('/goals/')[1];
  return <Navigate to={`/progress/goals/${id}`} replace />;
}

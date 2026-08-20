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
import { GoalsPage } from './pages/goals/GoalsPage';
import { CreateGoalPage } from './pages/goals/CreateGoalPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { ProgressPage } from './pages/progress/ProgressPage';



export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Rotas Públicas (Auth) */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<ProtectedRoute><OnboardingPage /></ProtectedRoute>} />

      {/* Rotas Protegidas com Layout Principal */}
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="sessions/new" element={<NewSessionPage />} />
        <Route path="sessions/:id" element={<SessionDetailPage />} />
        <Route path="progress" element={<ProgressPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="goals/new" element={<CreateGoalPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Fallback para home ou login */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

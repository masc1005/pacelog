import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { StrengthHomePage } from './pages/StrengthHomePage';
import { ActiveStrengthSessionPage } from './pages/ActiveStrengthSessionPage';
import { StrengthSessionReviewPage } from './pages/StrengthSessionReviewPage';
import { StrengthSessionDetailsPage } from './pages/StrengthSessionDetailsPage';

/**
 * Sub-rotas do módulo de musculação.
 * Montadas em /strength/* pelo AppRoutes principal.
 */
export const StrengthRoutes: React.FC = () => {
  return (
    <Routes>
      <Route index element={<StrengthHomePage />} />
      <Route path="active" element={<ActiveStrengthSessionPage />} />
      <Route path="review" element={<StrengthSessionReviewPage />} />
      <Route path="sessions/:id" element={<StrengthSessionDetailsPage />} />
    </Routes>
  );
};

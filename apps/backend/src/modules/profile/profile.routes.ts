import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { validate } from '../../middleware/validate.js';
import * as profileController from './profile.controller.js';
import {
  updateProfileSchema,
  updateSportsSchema,
  onboardingSchema,
} from './profile.schemas.js';

export const profileRoutes = Router();

// Todas as rotas de perfil requerem autenticação
profileRoutes.use(requireAuth);

profileRoutes.get('/', profileController.getProfile);
profileRoutes.put('/', validate(updateProfileSchema), profileController.updateProfile);
profileRoutes.patch('/sports', validate(updateSportsSchema), profileController.updateActiveSports);
profileRoutes.post('/onboarding', validate(onboardingSchema), profileController.completeOnboarding);
profileRoutes.delete('/account', profileController.deleteAccount);


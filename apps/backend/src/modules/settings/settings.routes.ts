import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { settingsController } from './settings.controller.js';

export const settingsRoutes = Router();

// Todas as rotas de configurações requerem autenticação
settingsRoutes.use(requireAuth);

// Preferências gerais
settingsRoutes.get('/', (req, res, next) => settingsController.getSettings(req, res, next));
settingsRoutes.patch('/', (req, res, next) => settingsController.updateSettings(req, res, next));

// Lembretes de treino
settingsRoutes.post('/reminders', (req, res, next) => settingsController.addReminder(req, res, next));
settingsRoutes.delete('/reminders/:id', (req, res, next) => settingsController.deleteReminder(req, res, next));

// Gestão de Esportes e Métricas
settingsRoutes.get('/sports', (req, res, next) => settingsController.getUserSports(req, res, next));
settingsRoutes.post('/sports/custom', (req, res, next) => settingsController.createCustomSport(req, res, next));
settingsRoutes.patch('/sports/:sportKey', (req, res, next) => settingsController.updateSport(req, res, next));
settingsRoutes.post('/sports/:sportKey/metrics/restore', (req, res, next) => settingsController.restoreSportMetrics(req, res, next));

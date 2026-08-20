import { Router } from 'express';
import { listSports } from './sport.controller.js';

export const sportRoutes = Router();

// Rota pública para listar esportes suportados pelo sistema
sportRoutes.get('/', listSports);

import { SportModel } from './sport.model.js';
import { logger } from '../../utils/logger.js';

export const OFFICIAL_SPORTS = [
  {
    sportKey: 'running',
    name: 'Corrida',
    category: 'endurance',
    icon: 'Activity',
    color: '#00F0FF', // Neon Cyan
    supportedMetrics: ['distanceKm', 'pace', 'elevationGainM', 'cadence', 'heartRate'],
    description: 'Treinos de rua, pista, intervalados, longões e rodagens regenerativas.',
    active: true,
    order: 1,
  },
  {
    sportKey: 'football',
    name: 'Futebol',
    category: 'team',
    icon: 'Flame',
    color: '#39FF14', // Neon Green
    supportedMetrics: ['goals', 'assists', 'result', 'rpe', 'position'],
    description: 'Partidas, treinos táticos e peladas com registro de impacto e performance.',
    active: true,
    order: 2,
  },
  {
    sportKey: 'futevolei',
    name: 'Futevôlei',
    category: 'team',
    icon: 'Sun',
    color: '#FFB800', // Neon Amber
    supportedMetrics: ['sets', 'pointsFor', 'pointsAgainst', 'won', 'courtType'],
    description: 'Partidas na areia com controle detalhado de sets, pontos e intensidade.',
    active: true,
    order: 3,
  },
  {
    sportKey: 'boxing',
    name: 'Boxe',
    category: 'combat',
    icon: 'Zap',
    color: '#FF3366', // Precision Crimson
    supportedMetrics: ['rounds', 'durationSeconds', 'restSeconds', 'punchesThrown', 'punchesLanded', 'rpe'],
    description: 'Sparrings, rounds de manopla, saco pesado e condicionamento de combate.',
    active: true,
    order: 4,
  },
  {
    sportKey: 'strength',
    name: 'Musculação / Força',
    category: 'strength',
    icon: 'Dumbbell',
    color: '#7B2CBF', // Electric Purple
    supportedMetrics: ['exercises', 'sets', 'repetitions', 'loadKg', 'loadMode', 'totalVolumeKg'],
    description: 'Sessões de hipertrofia, força bruta e condicionamento neuromuscular.',
    active: true,
    order: 5,
  },
];

export async function seedSports(): Promise<void> {
  try {
    for (const sport of OFFICIAL_SPORTS) {
      await SportModel.findOneAndUpdate(
        { sportKey: sport.sportKey },
        { $set: sport },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    logger.info('✅ Seed dos 5 esportes oficiais executado com sucesso.');
  } catch (error) {
    logger.error('Erro ao executar seed de esportes:', error);
    throw error;
  }
}

import { exerciseService } from './exercise.service.js';
import { MUSCLE_GROUPS, EQUIPMENT_TYPES, EXERCISE_TYPES } from '@pacelog/shared';

const SYSTEM_EXERCISES = [
  // Peito
  { key: 'supino_reto_barra', name: 'Supino Reto (Barra)', primaryMuscleGroup: 'peito', equipment: 'barra', type: 'compound' },
  { key: 'supino_inclinado_halteres', name: 'Supino Inclinado (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'compound' },
  { key: 'crucifixo_maquina', name: 'Crucifixo (Máquina)', primaryMuscleGroup: 'peito', equipment: 'maquina', type: 'isolation' },
  { key: 'crossover_polia', name: 'Crossover (Polia)', primaryMuscleGroup: 'peito', equipment: 'cabo', type: 'isolation' },
  
  // Costas
  { key: 'puxada_frente_polia', name: 'Puxada Frente (Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'remada_curvada_barra', name: 'Remada Curvada (Barra)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'compound' },
  { key: 'remada_baixa_triangulo', name: 'Remada Baixa (Triângulo)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'pulldown_corda', name: 'Pulldown (Corda)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'isolation' },
  { key: 'barra_fixa', name: 'Barra Fixa', primaryMuscleGroup: 'costas', equipment: 'peso_corporal', type: 'compound' },
  
  // Pernas
  { key: 'agachamento_livre', name: 'Agachamento Livre', primaryMuscleGroup: 'quadriceps', equipment: 'barra', type: 'compound' },
  { key: 'leg_press_45', name: 'Leg Press 45°', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'compound' },
  { key: 'cadeira_extensora', name: 'Cadeira Extensora', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'isolation' },
  { key: 'cadeira_flexora', name: 'Cadeira Flexora', primaryMuscleGroup: 'posteriores', equipment: 'maquina', type: 'isolation' },
  { key: 'mesa_flexora', name: 'Mesa Flexora', primaryMuscleGroup: 'posteriores', equipment: 'maquina', type: 'isolation' },
  { key: 'stiff_barra', name: 'Stiff (Barra)', primaryMuscleGroup: 'posteriores', equipment: 'barra', type: 'compound' },
  { key: 'elevacao_pelvica', name: 'Elevação Pélvica', primaryMuscleGroup: 'gluteos', equipment: 'barra', type: 'compound' },
  { key: 'panturrilha_em_pe', name: 'Panturrilha em pé', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },
  { key: 'panturrilha_sentado', name: 'Panturrilha sentado', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },
  
  // Ombros
  { key: 'desenvolvimento_halteres', name: 'Desenvolvimento (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'compound' },
  { key: 'elevacao_lateral_halteres', name: 'Elevação Lateral (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'isolation' },
  { key: 'elevacao_frontal_polia', name: 'Elevação Frontal (Polia)', primaryMuscleGroup: 'ombros', equipment: 'cabo', type: 'isolation' },
  { key: 'crucifixo_invertido_maquina', name: 'Crucifixo Invertido (Máquina)', primaryMuscleGroup: 'ombros', equipment: 'maquina', type: 'isolation' },
  
  // Braços
  { key: 'rosca_direta_barra', name: 'Rosca Direta (Barra)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'rosca_alternada_halteres', name: 'Rosca Alternada (Halteres)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_scott_maquina', name: 'Rosca Scott (Máquina)', primaryMuscleGroup: 'biceps', equipment: 'maquina', type: 'isolation' },
  { key: 'triceps_corda_polia', name: 'Tríceps Corda (Polia)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_testa_barra', name: 'Tríceps Testa (Barra)', primaryMuscleGroup: 'triceps', equipment: 'barra', type: 'isolation' },
  { key: 'triceps_frances_halter', name: 'Tríceps Francês (Halter)', primaryMuscleGroup: 'triceps', equipment: 'halteres', type: 'isolation' },
  
  // Abdômen
  { key: 'abdominal_supra', name: 'Abdominal Supra', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'prancha_isometrica', name: 'Prancha Isométrica', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_infra_pendurado', name: 'Abdominal Infra Pendurado', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
];

export async function seedExercises() {
  await exerciseService.seedSystemExercises(SYSTEM_EXERCISES);
}

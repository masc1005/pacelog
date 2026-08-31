import { exerciseService } from './exercise.service.js';
import type { MuscleGroup, EquipmentType, ExerciseType } from '@pacelog/shared';

interface SystemExerciseSeed {
  key: string;
  name: string;
  primaryMuscleGroup: MuscleGroup;
  equipment: EquipmentType;
  type: ExerciseType;
}

export const SYSTEM_EXERCISES: SystemExerciseSeed[] = [
  // ==========================================
  // PEITO (CHEST)
  // ==========================================
  { key: 'supino_reto_barra', name: 'Supino Reto (Barra)', primaryMuscleGroup: 'peito', equipment: 'barra', type: 'compound' },
  { key: 'supino_reto_halteres', name: 'Supino Reto (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'compound' },
  { key: 'supino_reto_smith', name: 'Supino Reto (Smith)', primaryMuscleGroup: 'peito', equipment: 'smith', type: 'compound' },
  { key: 'supino_reto_maquina', name: 'Supino Reto (Máquina / Articulado)', primaryMuscleGroup: 'peito', equipment: 'maquina', type: 'compound' },
  { key: 'supino_inclinado_barra', name: 'Supino Inclinado (Barra)', primaryMuscleGroup: 'peito', equipment: 'barra', type: 'compound' },
  { key: 'supino_inclinado_halteres', name: 'Supino Inclinado (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'compound' },
  { key: 'supino_inclinado_smith', name: 'Supino Inclinado (Smith)', primaryMuscleGroup: 'peito', equipment: 'smith', type: 'compound' },
  { key: 'supino_inclinado_maquina', name: 'Supino Inclinado (Máquina / Articulado)', primaryMuscleGroup: 'peito', equipment: 'maquina', type: 'compound' },
  { key: 'supino_declinado_barra', name: 'Supino Declinado (Barra)', primaryMuscleGroup: 'peito', equipment: 'barra', type: 'compound' },
  { key: 'supino_declinado_halteres', name: 'Supino Declinado (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'compound' },
  { key: 'crucifixo_reto_halteres', name: 'Crucifixo Reto (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'isolation' },
  { key: 'crucifixo_inclinado_halteres', name: 'Crucifixo Inclinado (Halteres)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'isolation' },
  { key: 'crucifixo_maquina', name: 'Crucifixo (Máquina / Peck Deck)', primaryMuscleGroup: 'peito', equipment: 'maquina', type: 'isolation' },
  { key: 'crossover_polia_alta', name: 'Crossover (Polia Alta)', primaryMuscleGroup: 'peito', equipment: 'cabo', type: 'isolation' },
  { key: 'crossover_polia_media', name: 'Crossover (Polia Média)', primaryMuscleGroup: 'peito', equipment: 'cabo', type: 'isolation' },
  { key: 'crossover_polia_baixa', name: 'Crossover (Polia Baixa)', primaryMuscleGroup: 'peito', equipment: 'cabo', type: 'isolation' },
  { key: 'flexao_braco', name: 'Flexão de Braço (Push-up)', primaryMuscleGroup: 'peito', equipment: 'peso_corporal', type: 'compound' },
  { key: 'flexao_declinada', name: 'Flexão Declinada', primaryMuscleGroup: 'peito', equipment: 'peso_corporal', type: 'compound' },
  { key: 'paralelas_peito', name: 'Paralelas com Tronco Inclinado (Dips)', primaryMuscleGroup: 'peito', equipment: 'peso_corporal', type: 'compound' },
  { key: 'pullover_halter', name: 'Pullover (Halter)', primaryMuscleGroup: 'peito', equipment: 'halteres', type: 'isolation' },

  // ==========================================
  // COSTAS & DORSAL & TRAPÉZIO (BACK)
  // ==========================================
  { key: 'puxada_frente_polia', name: 'Puxada Frente Aberta (Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'puxada_frente_triangulo', name: 'Puxada Frente com Triângulo', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'puxada_supinada_polia', name: 'Puxada Supinada (Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'puxada_articulada_maquina', name: 'Puxada Articulada (Máquina)', primaryMuscleGroup: 'costas', equipment: 'maquina', type: 'compound' },
  { key: 'barra_fixa', name: 'Barra Fixa Pronada (Pull-up)', primaryMuscleGroup: 'costas', equipment: 'peso_corporal', type: 'compound' },
  { key: 'barra_fixa_supinada', name: 'Barra Fixa Supinada (Chin-up)', primaryMuscleGroup: 'costas', equipment: 'peso_corporal', type: 'compound' },
  { key: 'barra_fixa_graviton', name: 'Barra Fixa Assistida (Graviton)', primaryMuscleGroup: 'costas', equipment: 'maquina', type: 'compound' },
  { key: 'remada_curvada_barra', name: 'Remada Curvada Pronada (Barra)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'compound' },
  { key: 'remada_curvada_supinada', name: 'Remada Curvada Supinada (Barra)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'compound' },
  { key: 'remada_curvada_halteres', name: 'Remada Curvada (Halteres)', primaryMuscleGroup: 'costas', equipment: 'halteres', type: 'compound' },
  { key: 'remada_serrote_halter', name: 'Remada Unilateral / Serrote (Halter)', primaryMuscleGroup: 'costas', equipment: 'halteres', type: 'compound' },
  { key: 'remada_baixa_triangulo', name: 'Remada Baixa (Triângulo / Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'remada_baixa_barra', name: 'Remada Baixa (Barra Reta / Cabo)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'compound' },
  { key: 'remada_cavalinho_barra_t', name: 'Remada Cavalinho (Barra T)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'compound' },
  { key: 'remada_maquina_articulada', name: 'Remada Máquina / Articulada', primaryMuscleGroup: 'costas', equipment: 'maquina', type: 'compound' },
  { key: 'pulldown_corda', name: 'Pulldown (Corda / Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'isolation' },
  { key: 'pulldown_barra', name: 'Pulldown (Barra Reta / Polia)', primaryMuscleGroup: 'costas', equipment: 'cabo', type: 'isolation' },
  { key: 'levantamento_terra', name: 'Levantamento Terra (Deadlift)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'compound' },
  { key: 'encolhimento_barra', name: 'Encolhimento de Ombros (Barra)', primaryMuscleGroup: 'costas', equipment: 'barra', type: 'isolation' },
  { key: 'encolhimento_halteres', name: 'Encolhimento de Ombros (Halteres)', primaryMuscleGroup: 'costas', equipment: 'halteres', type: 'isolation' },
  { key: 'encolhimento_smith', name: 'Encolhimento de Ombros (Smith)', primaryMuscleGroup: 'costas', equipment: 'smith', type: 'isolation' },
  { key: 'hiperextensao_lombar', name: 'Hiperextensão Lombar (Banco Romano)', primaryMuscleGroup: 'costas', equipment: 'peso_corporal', type: 'isolation' },

  // ==========================================
  // OMBROS (SHOULDERS / DELTOIDES)
  // ==========================================
  { key: 'desenvolvimento_militar_barra', name: 'Desenvolvimento Militar em Pé (Barra)', primaryMuscleGroup: 'ombros', equipment: 'barra', type: 'compound' },
  { key: 'desenvolvimento_halteres', name: 'Desenvolvimento Sentado (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'compound' },
  { key: 'desenvolvimento_smith', name: 'Desenvolvimento (Smith)', primaryMuscleGroup: 'ombros', equipment: 'smith', type: 'compound' },
  { key: 'desenvolvimento_maquina', name: 'Desenvolvimento (Máquina / Articulado)', primaryMuscleGroup: 'ombros', equipment: 'maquina', type: 'compound' },
  { key: 'desenvolvimento_arnold', name: 'Desenvolvimento Arnold (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'compound' },
  { key: 'elevacao_lateral_halteres', name: 'Elevação Lateral (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'isolation' },
  { key: 'elevacao_lateral_polia', name: 'Elevação Lateral (Polia / Cabo)', primaryMuscleGroup: 'ombros', equipment: 'cabo', type: 'isolation' },
  { key: 'elevacao_lateral_maquina', name: 'Elevação Lateral (Máquina)', primaryMuscleGroup: 'ombros', equipment: 'maquina', type: 'isolation' },
  { key: 'elevacao_lateral_inclinada', name: 'Elevação Lateral Inclinada (Halter)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'isolation' },
  { key: 'elevacao_frontal_halteres', name: 'Elevação Frontal (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'isolation' },
  { key: 'elevacao_frontal_barra', name: 'Elevação Frontal (Barra)', primaryMuscleGroup: 'ombros', equipment: 'barra', type: 'isolation' },
  { key: 'elevacao_frontal_polia', name: 'Elevação Frontal (Polia / Corda)', primaryMuscleGroup: 'ombros', equipment: 'cabo', type: 'isolation' },
  { key: 'crucifixo_invertido_halteres', name: 'Crucifixo Invertido (Halteres)', primaryMuscleGroup: 'ombros', equipment: 'halteres', type: 'isolation' },
  { key: 'crucifixo_invertido_maquina', name: 'Crucifixo Invertido (Máquina / Peck Deck)', primaryMuscleGroup: 'ombros', equipment: 'maquina', type: 'isolation' },
  { key: 'face_pull_polia', name: 'Face Pull (Polia com Corda)', primaryMuscleGroup: 'ombros', equipment: 'cabo', type: 'isolation' },
  { key: 'remada_alta_barra', name: 'Remada Alta (Barra W / Reta)', primaryMuscleGroup: 'ombros', equipment: 'barra', type: 'compound' },
  { key: 'remada_alta_polia', name: 'Remada Alta (Polia Baixa)', primaryMuscleGroup: 'ombros', equipment: 'cabo', type: 'compound' },

  // ==========================================
  // BÍCEPS & ANTEBRAÇO
  // ==========================================
  { key: 'rosca_direta_barra', name: 'Rosca Direta (Barra Reta)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'rosca_direta_barra_w', name: 'Rosca Direta (Barra W)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'rosca_direta_polia', name: 'Rosca Direta (Polia Baixa)', primaryMuscleGroup: 'biceps', equipment: 'cabo', type: 'isolation' },
  { key: 'rosca_alternada_halteres', name: 'Rosca Alternada (Halteres)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_martelo_halteres', name: 'Rosca Martelo (Halteres)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_martelo_polia', name: 'Rosca Martelo (Polia com Corda)', primaryMuscleGroup: 'biceps', equipment: 'cabo', type: 'isolation' },
  { key: 'rosca_scott_barra_w', name: 'Rosca Scott (Barra W)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'rosca_scott_halter', name: 'Rosca Scott Unilateral (Halter)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_scott_maquina', name: 'Rosca Scott (Máquina)', primaryMuscleGroup: 'biceps', equipment: 'maquina', type: 'isolation' },
  { key: 'rosca_concentrada_halter', name: 'Rosca Concentrada (Halter)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_inclinada_45', name: 'Rosca Inclinada 45° (Halteres)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_spider', name: 'Rosca Spider (Banco Inclinado)', primaryMuscleGroup: 'biceps', equipment: 'halteres', type: 'isolation' },
  { key: 'rosca_inversa_barra', name: 'Rosca Inversa (Barra W / Antebraço)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'flexao_punho_barra', name: 'Flexão de Punho (Barra / Antebraço)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },
  { key: 'extensao_punho_barra', name: 'Extensão de Punho (Barra / Antebraço)', primaryMuscleGroup: 'biceps', equipment: 'barra', type: 'isolation' },

  // ==========================================
  // TRÍCEPS
  // ==========================================
  { key: 'triceps_corda_polia', name: 'Tríceps Corda (Polia Alta)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_barra_polia', name: 'Tríceps Barra Reta (Polia Alta)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_barra_v_polia', name: 'Tríceps Barra V (Polia Alta)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_testa_barra', name: 'Tríceps Testa (Barra W)', primaryMuscleGroup: 'triceps', equipment: 'barra', type: 'isolation' },
  { key: 'triceps_testa_halteres', name: 'Tríceps Testa (Halteres)', primaryMuscleGroup: 'triceps', equipment: 'halteres', type: 'isolation' },
  { key: 'triceps_testa_polia', name: 'Tríceps Testa (Polia)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_frances_halter', name: 'Tríceps Francês Unilateral (Halter)', primaryMuscleGroup: 'triceps', equipment: 'halteres', type: 'isolation' },
  { key: 'triceps_frances_bilateral', name: 'Tríceps Francês Bilateral (Halter)', primaryMuscleGroup: 'triceps', equipment: 'halteres', type: 'isolation' },
  { key: 'triceps_frances_polia', name: 'Tríceps Francês na Polia (Corda)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_coice_halter', name: 'Tríceps Coice / Kickback (Halter)', primaryMuscleGroup: 'triceps', equipment: 'halteres', type: 'isolation' },
  { key: 'triceps_coice_polia', name: 'Tríceps Coice (Polia)', primaryMuscleGroup: 'triceps', equipment: 'cabo', type: 'isolation' },
  { key: 'triceps_paralelas', name: 'Tríceps nas Paralelas (Dips)', primaryMuscleGroup: 'triceps', equipment: 'peso_corporal', type: 'compound' },
  { key: 'triceps_banco', name: 'Tríceps Mergulho no Banco', primaryMuscleGroup: 'triceps', equipment: 'peso_corporal', type: 'compound' },
  { key: 'supino_fechado_barra', name: 'Supino Fechado (Barra)', primaryMuscleGroup: 'triceps', equipment: 'barra', type: 'compound' },
  { key: 'triceps_maquina', name: 'Tríceps Máquina / Articulado', primaryMuscleGroup: 'triceps', equipment: 'maquina', type: 'isolation' },

  // ==========================================
  // QUADRÍCEPS (COXA ANTERIOR)
  // ==========================================
  { key: 'agachamento_livre', name: 'Agachamento Livre (Barra)', primaryMuscleGroup: 'quadriceps', equipment: 'barra', type: 'compound' },
  { key: 'agachamento_frontal_barra', name: 'Agachamento Frontal (Barra)', primaryMuscleGroup: 'quadriceps', equipment: 'barra', type: 'compound' },
  { key: 'agachamento_smith', name: 'Agachamento no Smith', primaryMuscleGroup: 'quadriceps', equipment: 'smith', type: 'compound' },
  { key: 'agachamento_bulgaro_halteres', name: 'Agachamento Búlgaro (Halteres)', primaryMuscleGroup: 'quadriceps', equipment: 'halteres', type: 'compound' },
  { key: 'agachamento_bulgaro_smith', name: 'Agachamento Búlgaro (Smith)', primaryMuscleGroup: 'quadriceps', equipment: 'smith', type: 'compound' },
  { key: 'agachamento_hack', name: 'Agachamento Hack (Máquina)', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'compound' },
  { key: 'agachamento_goblet', name: 'Agachamento Goblet (Halter / Kettlebell)', primaryMuscleGroup: 'quadriceps', equipment: 'halteres', type: 'compound' },
  { key: 'agachamento_sumo', name: 'Agachamento Sumô (Halter / Barra)', primaryMuscleGroup: 'quadriceps', equipment: 'halteres', type: 'compound' },
  { key: 'leg_press_45', name: 'Leg Press 45°', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'compound' },
  { key: 'leg_press_horizontal', name: 'Leg Press Horizontal', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'compound' },
  { key: 'cadeira_extensora', name: 'Cadeira Extensora', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'isolation' },
  { key: 'passada_avanco_halteres', name: 'Passada / Avanço com Halteres', primaryMuscleGroup: 'quadriceps', equipment: 'halteres', type: 'compound' },
  { key: 'passada_avanco_barra', name: 'Passada / Avanço com Barra', primaryMuscleGroup: 'quadriceps', equipment: 'barra', type: 'compound' },
  { key: 'afundo_smith', name: 'Afundo no Smith', primaryMuscleGroup: 'quadriceps', equipment: 'smith', type: 'compound' },
  { key: 'sissy_squat', name: 'Sissy Squat', primaryMuscleGroup: 'quadriceps', equipment: 'peso_corporal', type: 'isolation' },

  // ==========================================
  // POSTERIORES DE COXA (ISQUIOTIBIAIS)
  // ==========================================
  { key: 'cadeira_flexora', name: 'Cadeira Flexora', primaryMuscleGroup: 'posteriores', equipment: 'maquina', type: 'isolation' },
  { key: 'mesa_flexora', name: 'Mesa Flexora', primaryMuscleGroup: 'posteriores', equipment: 'maquina', type: 'isolation' },
  { key: 'flexora_em_pe_unilateral', name: 'Flexora em Pé Unilateral (Máquina)', primaryMuscleGroup: 'posteriores', equipment: 'maquina', type: 'isolation' },
  { key: 'stiff_barra', name: 'Stiff (Barra)', primaryMuscleGroup: 'posteriores', equipment: 'barra', type: 'compound' },
  { key: 'stiff_halteres', name: 'Stiff (Halteres)', primaryMuscleGroup: 'posteriores', equipment: 'halteres', type: 'compound' },
  { key: 'stiff_smith', name: 'Stiff no Smith', primaryMuscleGroup: 'posteriores', equipment: 'smith', type: 'compound' },
  { key: 'rdl_barra', name: 'Levantamento Romeno / RDL (Barra)', primaryMuscleGroup: 'posteriores', equipment: 'barra', type: 'compound' },
  { key: 'rdl_halteres', name: 'Levantamento Romeno / RDL (Halteres)', primaryMuscleGroup: 'posteriores', equipment: 'halteres', type: 'compound' },
  { key: 'good_morning_barra', name: 'Good Morning / Bom Dia (Barra)', primaryMuscleGroup: 'posteriores', equipment: 'barra', type: 'compound' },
  { key: 'flexao_nordica', name: 'Flexão Nórdica', primaryMuscleGroup: 'posteriores', equipment: 'peso_corporal', type: 'isolation' },

  // ==========================================
  // GLÚTEOS
  // ==========================================
  { key: 'elevacao_pelvica', name: 'Elevação Pélvica / Hip Thrust (Barra)', primaryMuscleGroup: 'gluteos', equipment: 'barra', type: 'compound' },
  { key: 'elevacao_pelvica_maquina', name: 'Elevação Pélvica (Máquina)', primaryMuscleGroup: 'gluteos', equipment: 'maquina', type: 'compound' },
  { key: 'elevacao_pelvica_smith', name: 'Elevação Pélvica (Smith)', primaryMuscleGroup: 'gluteos', equipment: 'smith', type: 'compound' },
  { key: 'cadeira_abdutora', name: 'Cadeira Abdutora', primaryMuscleGroup: 'gluteos', equipment: 'maquina', type: 'isolation' },
  { key: 'cadeira_adutora', name: 'Cadeira Adutora', primaryMuscleGroup: 'quadriceps', equipment: 'maquina', type: 'isolation' },
  { key: 'gluteo_quatro_apoios', name: 'Glúteo 4 Apoios (Caneleira)', primaryMuscleGroup: 'gluteos', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'gluteo_polia_cabo', name: 'Glúteo na Polia (Cabo)', primaryMuscleGroup: 'gluteos', equipment: 'cabo', type: 'isolation' },
  { key: 'gluteo_coice_maquina', name: 'Glúteo Coice (Máquina)', primaryMuscleGroup: 'gluteos', equipment: 'maquina', type: 'isolation' },

  // ==========================================
  // PANTURRILHAS (CALVES)
  // ==========================================
  { key: 'panturrilha_em_pe', name: 'Panturrilha em Pé (Máquina)', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },
  { key: 'panturrilha_em_pe_smith', name: 'Panturrilha em Pé (Smith)', primaryMuscleGroup: 'panturrilhas', equipment: 'smith', type: 'isolation' },
  { key: 'panturrilha_leg_press', name: 'Panturrilha no Leg Press 45°', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },
  { key: 'panturrilha_sentado', name: 'Panturrilha Sentado (Sóleo / Gêmeos)', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },
  { key: 'panturrilha_unilateral_halter', name: 'Panturrilha Unilateral (Halter)', primaryMuscleGroup: 'panturrilhas', equipment: 'halteres', type: 'isolation' },
  { key: 'panturrilha_donkey', name: 'Panturrilha Donkey (Burrinho)', primaryMuscleGroup: 'panturrilhas', equipment: 'maquina', type: 'isolation' },

  // ==========================================
  // ABDÔMEN & CORE
  // ==========================================
  { key: 'abdominal_supra', name: 'Abdominal Supra no Solo', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_supra_declinado', name: 'Abdominal Supra no Banco Declinado', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_maquina', name: 'Abdominal na Máquina', primaryMuscleGroup: 'abdomen', equipment: 'maquina', type: 'isolation' },
  { key: 'abdominal_crunch_polia', name: 'Abdominal Crunch (Polia / Cabo)', primaryMuscleGroup: 'abdomen', equipment: 'cabo', type: 'isolation' },
  { key: 'abdominal_infra_solo', name: 'Abdominal Infra no Solo', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_infra_pendurado', name: 'Abdominal Infra Pendurado na Barra', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_infra_paralelas', name: 'Abdominal Infra nas Paralelas (Capitão)', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'prancha_isometrica', name: 'Prancha Isométrica Frontal', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'prancha_lateral', name: 'Prancha Lateral', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'abdominal_ab_wheel', name: 'Abdominal com Roda (Ab Wheel)', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'russian_twist', name: 'Russian Twist com Peso', primaryMuscleGroup: 'abdomen', equipment: 'halteres', type: 'isolation' },
  { key: 'abdominal_bicicleta', name: 'Abdominal Bicicleta', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },
  { key: 'vacuum_abdominal', name: 'Stomach Vacuum (Core Profundo)', primaryMuscleGroup: 'abdomen', equipment: 'peso_corporal', type: 'isolation' },

  // ==========================================
  // CORPO INTEIRO & FUNCIONAL & CONDICIONAMENTO
  // ==========================================
  { key: 'kettlebell_swing', name: 'Kettlebell Swing', primaryMuscleGroup: 'corpo_inteiro', equipment: 'kettlebell', type: 'compound' },
  { key: 'clean_and_press', name: 'Clean & Press (Arremesso com Barra)', primaryMuscleGroup: 'corpo_inteiro', equipment: 'barra', type: 'compound' },
  { key: 'snatch_barra', name: 'Snatch (Arranco com Barra)', primaryMuscleGroup: 'corpo_inteiro', equipment: 'barra', type: 'compound' },
  { key: 'thruster_barra', name: 'Thruster com Barra', primaryMuscleGroup: 'corpo_inteiro', equipment: 'barra', type: 'compound' },
  { key: 'thruster_halteres', name: 'Thruster com Halteres', primaryMuscleGroup: 'corpo_inteiro', equipment: 'halteres', type: 'compound' },
  { key: 'burpee', name: 'Burpee', primaryMuscleGroup: 'corpo_inteiro', equipment: 'peso_corporal', type: 'cardio' },
  { key: 'farmers_walk', name: "Farmer's Walk (Caminhada do Fazendeiro)", primaryMuscleGroup: 'corpo_inteiro', equipment: 'halteres', type: 'compound' },
  { key: 'medicine_ball_slam', name: 'Medicine Ball Slam', primaryMuscleGroup: 'corpo_inteiro', equipment: 'outro', type: 'compound' },
];

export async function seedExercises(): Promise<void> {
  await exerciseService.seedSystemExercises(SYSTEM_EXERCISES);
}

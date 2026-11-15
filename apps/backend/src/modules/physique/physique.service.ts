import { GoogleGenAI } from '@google/genai';
import {
  MUSCLE_GROUPS,
  PHYSIQUE_CAPTURE_SLOTS,
  PHYSIQUE_IMAGE_REJECTION_REASONS,
  PhysiqueAssessmentResultSchema,
  type CreatePhysiqueAssessmentInput,
  type GeneratePhysiquePlanInput,
  type MuscleGroup,
  type PhysiqueAssessmentResult,
  type PhysiqueCaptureSlot,
  type PhysiqueImageRejectionReason,
  type PhysiquePoseBreakdownItem,
} from '@pacelog/shared';
import { env } from '../../config/env.js';
import {
  getValidGeminiModel,
  PRIMARY_GEMINI_MODEL,
  FALLBACK_GEMINI_MODEL,
} from '../insights/insight.service.js';
import { ProfileModel } from '../profile/profile.model.js';
import { scopedFilter } from '../../utils/scopedQuery.js';
import { HttpError } from '../../utils/httpError.js';
import {
  PhysiqueAssessmentModel,
  type IPhysiqueAssessmentDocument,
} from './physique.model.js';
import { strengthAIService } from '../strength/strength-ai.service.js';

const STRENGTH_MUSCLE_GROUPS: MuscleGroup[] = MUSCLE_GROUPS.filter(
  (g) => !['corpo_inteiro', 'mobilidade', 'cardio'].includes(g)
);

const MAX_VALID_ASSESSMENTS_PER_WEEK = 2;
const RATE_LIMIT_WINDOW_DAYS = 7;

const SLOT_LABELS_PT: Record<PhysiqueCaptureSlot, string> = {
  front: 'Frente (Postura Natural)',
  back: 'Costas (Postura Natural)',
  side: 'Perfil (Postura Natural)',
  front_double_biceps: 'Duplo Bíceps de Frente',
  side_chest: 'Peitoral Melhor Lado',
  back_double_biceps: 'Bíceps de Costas',
  side_triceps: 'Lado Tríceps',
  abs_and_thighs: 'Abdominais e Coxa',
};

const SLOT_EVALUATION_DEFAULTS: Record<
  PhysiqueCaptureSlot,
  { analysis: string; tip: string }
> = {
  front: {
    analysis:
      'Leitura anatômica frontal em repouso: proporção clavícula-cintura (V-taper natural), simetria bilateral de ombros/braços, linha abdominal e alinhamento de joelhos.',
    tip: 'Mantenha pés paralelos na largura do quadril, braços relaxados levemente afastados do tronco e olhar horizontal para leitura postural limpa.',
  },
  back: {
    analysis:
      'Leitura anatômica posterior em repouso: largura dorsal natural, simetria escapular, densidade de trapézio, glúteos, posteriores e panturrilhas.',
    tip: 'Mantenha coluna neutra sem forçar retração excessiva, braços soltos ao lado do corpo e calcanhares alinhados para comparar simetria.',
  },
  side: {
    analysis:
      'Leitura anatômica de perfil em repouso: equilíbrio anteroposterior de tronco (peitoral vs. dorsal/deltoide posterior), postura cervical/lombar e relação quadríceps vs. posterior.',
    tip: 'Posicione o corpo a 90° exatos da câmera, mantendo o braço próximo ao corpo levemente recuado ou neutro para não obstruir a linha abdominal e dorsal.',
  },
  front_double_biceps: {
    analysis:
      'Avaliação de pico de bíceps, simetria de braços, abertura de dorsal frontal (V-taper), linha de cintura e volume de quadríceps.',
    tip: 'Eleve os cotovelos levemente acima da linha dos ombros, projete o dorsal para fora antes de fechar os punhos e trave os quadríceps com leve rotação externa dos pés.',
  },
  side_chest: {
    analysis:
      'Avaliação de espessura peitoral (feixe clavicular/superior), deltoide anterior/lateral, braço de perfil, caixa torácica e curvatura de posterior/panturrilha.',
    tip: 'Pressione o braço da frente contra o tronco para projetar o peitoral superior, eleve a caixa torácica e comprima o posterior da perna da frente contra a de trás.',
  },
  back_double_biceps: {
    analysis:
      'Avaliação de largura e inserção baixa de dorsais, densidade de trapézio/romboides, deltoide posterior, cabeça longa do tríceps, lombar, glúteo e posterior/panturrilha.',
    tip: 'Incline o tronco cerca de 10° para trás em direção à câmera para mostrar espessura lombar e dorsal sem fechar as escápulas antes da hora.',
  },
  side_triceps: {
    analysis:
      'Avaliação da cabeça longa e lateral do tríceps (ferradura), separação de deltoide, controle abdominal/oblíquos e cortes laterais de coxa.',
    tip: 'Gire o ombro da frente levemente para trás para abrir a ferradura do tríceps, mantenha o abdômen travado (sem dilatar) e flexione o quadríceps/posterior lateral.',
  },
  abs_and_thighs: {
    analysis:
      'Avaliação de profundidade dos blocos abdominais, serrátil anterior, oblíquos e separação das cabeças do quadríceps (vasto medial, lateral e reto femoral).',
    tip: 'Expire o ar antes de contrair o abdômen para baixo (sem arredondar demais a lombar), abra os cotovelos para exibir o serrátil e estenda uma perna à frente travando o vasto medial.',
  },
};

const MUSCLE_GROUP_ALIASES: Record<string, MuscleGroup> = {
  peito: 'peito',
  peitoral: 'peito',
  chest: 'peito',
  costas: 'costas',
  dorsal: 'costas',
  dorsais: 'costas',
  trapezio: 'costas',
  back: 'costas',
  ombros: 'ombros',
  ombro: 'ombros',
  deltoides: 'ombros',
  deltoide: 'ombros',
  shoulders: 'ombros',
  biceps: 'biceps',
  bíceps: 'biceps',
  triceps: 'triceps',
  tríceps: 'triceps',
  quadriceps: 'quadriceps',
  quadríceps: 'quadriceps',
  coxas: 'quadriceps',
  posteriores: 'posteriores',
  posterior: 'posteriores',
  isquiotibiais: 'posteriores',
  hamstrings: 'posteriores',
  gluteos: 'gluteos',
  glúteos: 'gluteos',
  gluteo: 'gluteos',
  panturrilhas: 'panturrilhas',
  panturrilha: 'panturrilhas',
  gemeos: 'panturrilhas',
  calves: 'panturrilhas',
  abdomen: 'abdomen',
  abdômen: 'abdomen',
  abdominal: 'abdomen',
  core: 'abdomen',
  corpo_inteiro: 'corpo_inteiro',
  mobilidade: 'mobilidade',
  cardio: 'cardio',
};

function normalizeMuscleGroup(raw: string): MuscleGroup {
  const normalized = (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (MUSCLE_GROUP_ALIASES[normalized]) {
    return MUSCLE_GROUP_ALIASES[normalized];
  }
  const exact = MUSCLE_GROUPS.find((m) => m === normalized);
  if (exact) return exact;

  for (const [alias, target] of Object.entries(MUSCLE_GROUP_ALIASES)) {
    if (normalized.includes(alias)) return target;
  }
  return 'ombros';
}

function normalizeCaptureSlot(raw: string): PhysiqueCaptureSlot | null {
  const normalized = (raw || '').toLowerCase().trim();
  if ((PHYSIQUE_CAPTURE_SLOTS as readonly string[]).includes(normalized)) {
    return normalized as PhysiqueCaptureSlot;
  }
  return null;
}

function buildPhysiqueSystemPrompt(): string {
  return `Você é um Avaliador Físico Biomecânico, Juiz Técnico de Fisiculturismo e Especialista em Telemetria Corporal do Pacelog.
Sua tarefa é analisar fotos do atleta (sejam fotos anatômicas naturais front/back/side e/ou poses oficiais de fisiculturismo) usando calibração fotogramétrica real e retornar EXCLUSIVAMENTE um JSON estruturado, objetivo e técnico (sem linguagem clínica/médica ou diagnósticos patológicos).

ETAPA 0 — CONTROLE DE QUALIDADE E ENQUADRAMENTO (OBRIGATÓRIO):
- Antes de avaliar o físico, verifique se cada foto permite leitura muscular clara e corresponde ao ângulo/pose declarado.
- ATENÇÃO IMPORTANTE: Para fotos naturais ('front', 'back', 'side'), o atleta está intencionalmente em postura anatômica relaxada — NUNCA rejeite fotos 'front', 'back' ou 'side' por não estarem contraindo poses de fisiculturismo.
- Só rejeite com 'wrong_pose' quando a orientação/pose for claramente incompatível (ex: enviou costas no slot de frente, ou não há pose/físico visível).
- Se estiver extremamente escura/borrada ('poor_lighting_or_blur'), com enquadramento inutilizável ('bad_framing') ou roupas largas ocultando totalmente o físico ('clothing_obscured'), retorne 'imageQualityCheck.isAssessable = false', informe 'rejectionReason' e um 'userFeedback' amigável.

DIRETRIZES OBRIGATÓRIAS:
1. CALIBRAÇÃO FOTOGRAMÉTRICA:
   - Use 'heightCm', 'weightKg', 'biologicalSex' e 'age' como escala mestra vertical, volumétrica e referência fisiológica.
   - Identifique objetos de referência no ambiente (portas ~210cm, interruptores ~115cm, azulejos, espelhos, racks/anilhas de academia) em 'detectedReferenceObjects'.
   - Cruze a perspectiva desses objetos com a altura real para descontar distorções de ângulo/lente da câmera e registre em 'perspectiveDistortionNote' e 'calibrationConfidence' ('high', 'medium' ou 'low').

2. LEITURA ESPECÍFICA POR ÂNGULO NATURAL OU POSE (gere 'poseBreakdown' para cada item enviado):
   - Fotos Naturais ('front', 'back', 'side'): avalie proporção estrutural em repouso, simetria esquerda/direita, alinhamento de ombros/escápulas/pelve, V-taper natural e distribuição de massa muscular; em 'posingExecutionTip', dê dicas de enquadramento/postura anatômica para próximas fotos comparativas.
   - 'front_double_biceps': avalie pico de bíceps, simetria de braços, abertura de dorsal frontal (V-taper), linha de cintura e volume de quadríceps.
   - 'side_chest': avalie espessura peitoral (especialmente feixe clavicular/superior), deltoide anterior/lateral, braço de perfil, caixa torácica e curvatura de posterior de coxa/panturrilha.
   - 'back_double_biceps': avalie largura e inserção baixa de dorsais, densidade de trapézio/romboides, deltoide posterior, cabeça longa do tríceps, lombar, glúteo e posterior/panturrilha de costas.
   - 'side_triceps': avalie cabeça longa e lateral do tríceps ("ferradura"), separação de deltoide, controle de linha abdominal/oblíquos e cortes laterais de coxa.
   - 'abs_and_thighs': avalie profundidade dos blocos abdominais, serrátil anterior, oblíquos e separação das cabeças do quadríceps (vasto medial, lateral e reto femoral).
   - Para poses de fisiculturismo, 'posingExecutionTip' deve corrigir a execução da pose (ex.: altura de cotovelos, encaixe de escápula, ativação de coxa, expiração abdominal).

3. PONTOS FRACOS COM SUB-REGIÃO E RASTREAMENTO:
   - Em 'weakPoints', identifique exatamente a sub-região anatômica em 'subRegion' (ex: "Peitoral superior (feixe clavicular)", "Deltoide posterior", "Cabeça longa do tríceps", "Vasto medial do quadríceps", "Largura de dorsal") e liste em 'detectedInPoses' em quais ângulos/poses enviados o déficit apareceu.
   - Use exclusivamente as chaves oficiais em 'muscleGroup': ${STRENGTH_MUSCLE_GROUPS.join(', ')}.`;
}

function stripBase64Prefix(raw: string): string {
  const idx = raw.indexOf('base64,');
  if (idx !== -1) {
    return raw.slice(idx + 7);
  }
  return raw;
}

interface PreviousComparisonContext {
  createdAt: Date;
  weightKg: number;
  daysSinceLast: number;
  weightDeltaKg: number;
  result: PhysiqueAssessmentResult;
}

export class PhysiqueService {
  private ai: GoogleGenAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    }
  }

  private async callGeminiMultimodalWithTimeout(
    modelName: string,
    systemInstruction: string,
    contents: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }>,
    timeoutMs: number
  ): Promise<any> {
    if (!this.ai) throw new Error('Gemini AI not initialized');

    let timeoutHandle: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms calling model ${modelName}`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([
        this.ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.25,
            responseMimeType: 'application/json',
          },
        }),
        timeoutPromise,
      ]);
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async assessPhysique(
    userId: string,
    input: CreatePhysiqueAssessmentInput
  ): Promise<IPhysiqueAssessmentDocument> {
    const heightM = input.heightCm / 100;
    const bmi = Number((input.weightKg / (heightM * heightM)).toFixed(1));

    let assessmentResult: PhysiqueAssessmentResult | null = null;
    let modelUsed = '';

    const submittedSlots: PhysiqueCaptureSlot[] = input.poses.map((p) => p.poseType);

    // Mantém referências efêmeras das imagens apenas durante a chamada multimodal
    let poseParts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = input.poses.flatMap((pose) => [
      {
        text: `CAPTURA ENVIADA: ${pose.poseType} (${SLOT_LABELS_PT[pose.poseType]})`,
      },
      {
        inlineData: {
          data: stripBase64Prefix(pose.base64),
          mimeType: pose.mimeType,
        },
      },
    ]);

    try {
      // 1. Rate limiting: máximo 2 avaliações válidas salvas a cada 7 dias
      const windowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_DAYS * 24 * 60 * 60 * 1000
      );
      const recentValidCount = await PhysiqueAssessmentModel.countDocuments(
        scopedFilter(userId, {
          createdAt: { $gte: windowStart },
          'result.imageQualityCheck.isAssessable': { $ne: false },
        })
      );

      if (recentValidCount >= MAX_VALID_ASSESSMENTS_PER_WEEK) {
        throw new HttpError(429, 'PHYSIQUE_RATE_LIMIT_EXCEEDED', {
          message: `Limite semanal atingido: você pode realizar até ${MAX_VALID_ASSESSMENTS_PER_WEEK} avaliações físicas válidas a cada ${RATE_LIMIT_WINDOW_DAYS} dias.`,
          limit: MAX_VALID_ASSESSMENTS_PER_WEEK,
          windowDays: RATE_LIMIT_WINDOW_DAYS,
        });
      }

      // Garante que nunca geramos avaliação fake quando a IA não estiver configurada/disponível
      if (!this.ai) {
        throw new HttpError(503, 'PHYSIQUE_AI_UNAVAILABLE', {
          message:
            'A avaliação física por IA está temporariamente indisponível. Nenhuma imagem foi salva e sua cota semanal não foi consumida. Por favor, tente novamente em alguns instantes.',
        });
      }

      // 2. Carrega última avaliação válida para memória evolutiva sem fotos
      const previousDoc = await PhysiqueAssessmentModel.findOne(
        scopedFilter(userId, {
          'result.imageQualityCheck.isAssessable': { $ne: false },
        })
      )
        .sort({ createdAt: -1 })
        .lean()
        .catch(() => null);

      // Persiste automaticamente altura, peso e contexto biológico no perfil do usuário
      const profileUpdate: Record<string, any> = {
        heightCm: input.heightCm,
        currentWeightKg: input.weightKg,
        biologicalSex: input.biologicalSex,
      };
      if (input.birthDate) {
        profileUpdate.birthDate = input.birthDate;
      }

      await ProfileModel.findOneAndUpdate(
        scopedFilter(userId),
        { $set: profileUpdate },
        { upsert: true, setDefaultsOnInsert: true }
      ).catch(() => {});

      const previousContext: PreviousComparisonContext | null = previousDoc
        ? {
            createdAt: new Date(previousDoc.createdAt),
            weightKg: previousDoc.weightKg,
            daysSinceLast: Math.max(
              0,
              Math.round(
                (Date.now() - new Date(previousDoc.createdAt).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            ),
            weightDeltaKg: Number(
              (input.weightKg - previousDoc.weightKg).toFixed(1)
            ),
            result: previousDoc.result,
          }
        : null;

      const primaryModel = getValidGeminiModel(
        env.GEMINI_MODEL || PRIMARY_GEMINI_MODEL
      );
      const modelsToTry = Array.from(
        new Set([primaryModel, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL])
      );

      const slotsSummary = submittedSlots
        .map((p) => `${p} (${SLOT_LABELS_PT[p]})`)
        .join(', ');

      const previousPromptBlock = previousContext
        ? `\nHISTÓRICO EVOLUTIVO DO ATLETA (laudo anterior de ${previousContext.daysSinceLast} dias atrás, sem fotos armazenadas):
${JSON.stringify({
  daysSinceLast: previousContext.daysSinceLast,
  previousWeightKg: previousContext.weightKg,
  currentWeightKg: input.weightKg,
  weightDeltaKg: previousContext.weightDeltaKg,
  previousBodyFatRange:
    previousContext.result.anthropometryEstimate?.estimatedBodyFatRange,
  previousVTaperScore:
    previousContext.result.anthropometryEstimate?.vTaperVisualScore,
  previousSymmetryScore:
    previousContext.result.anthropometryEstimate?.overallSymmetryScore,
  previousStrongPoints: previousContext.result.strongPoints,
  previousWeakPoints: previousContext.result.weakPoints?.map((w) => ({
    muscleGroup: w.muscleGroup,
    subRegion: w.subRegion,
    priority: w.priority,
    technicalReason: w.technicalReason,
  })),
  previousSummary: previousContext.result.physiqueSummary,
})}
IMPORTANTE: Como existe avaliação anterior, PREENCHA obrigatoriamente o campo 'comparisonWithPrevious' comparando condicionamento, V-taper e pontos fracos.\n`
        : '\nNão há avaliação anterior salva. NÃO inclua o campo comparisonWithPrevious.\n';

      const userPrompt = `DADOS DE CALIBRAÇÃO DO ATLETA:
- Altura real (escala mestra vertical): ${input.heightCm} cm
- Peso atual: ${input.weightKg} kg
- IMC calculado: ${bmi}
- Sexo biológico: ${input.biologicalSex === 'male' ? 'Masculino' : 'Feminino'}
- Idade: ${input.age} anos
- Objetivo / Categoria declarada: ${input.goal}
- Imagens enviadas (${submittedSlots.length}): ${slotsSummary}
${previousPromptBlock}
GRUPAMENTOS MUSCULARES PERMITIDOS EM 'muscleGroup':
${STRENGTH_MUSCLE_GROUPS.join(', ')}

CHAVES PERMITIDAS EM 'poseType' E 'detectedInPoses':
${PHYSIQUE_CAPTURE_SLOTS.join(', ')}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "imageQualityCheck": {
    "isAssessable": true,
    "rejectionReason": null,
    "userFeedback": null
  },
  "spatialCalibration": {
    "detectedReferenceObjects": ["batente de porta ~210cm", "interruptor ~115cm"],
    "perspectiveDistortionNote": "Explicação objetiva da inclinação/lente da câmera e como foi descontada pela altura real de ${input.heightCm} cm",
    "calibrationConfidence": "high | medium | low"
  },
  "anthropometryEstimate": {
    "bmi": ${bmi},
    "estimatedBodyFatRange": { "min": 10, "max": 13 },
    "vTaperVisualScore": 78,
    "overallSymmetryScore": 82
  },
  "poseBreakdown": [
    {
      "poseType": "${submittedSlots[0]}",
      "muscularAnalysis": "Leitura muscular técnica específica da foto/pose",
      "posingExecutionTip": "Dica de postura/enquadramento (para ângulo natural) ou execução técnica (para pose de fisiculturismo)"
    }
  ],
  "physiqueSummary": "Leitura técnica geral de proporção, densidade, condicionamento e simetria.",
  "strongPoints": [
    { "muscleGroup": "peito", "note": "Observação técnica objetiva" }
  ],
  "weakPoints": [
    {
      "muscleGroup": "ombros",
      "subRegion": "Deltoide posterior e porção lateral",
      "priority": "high | medium",
      "detectedInPoses": ["${submittedSlots[0]}"],
      "technicalReason": "Razão biomecânica/estética baseada nas imagens avaliadas",
      "targetWeeklySets": 16,
      "recommendedExerciseNames": ["Crucifixo Invertido (Halteres)", "Elevação Lateral (Polia / Cabo)"]
    }
  ],
  "posturalObservations": [
    "Observação curta sobre alinhamento escapular, pélvico ou de ombros"
  ],
  "recommendedSplit": "Sugestão objetiva de divisão semanal priorizando os pontos fracos"${
    previousContext
      ? `,
  "comparisonWithPrevious": {
    "daysSinceLast": ${previousContext.daysSinceLast},
    "weightDeltaKg": ${previousContext.weightDeltaKg},
    "conditioningEvolutionNote": "Evolução de condicionamento, definição e maturidade muscular vs. avaliação anterior",
    "weakPointsProgress": "Evolução perceptível dos pontos fracos anteriores"
  }`
      : ''
  }
}

Se a imagem NÃO for avaliável, retorne:
{
  "imageQualityCheck": {
    "isAssessable": false,
    "rejectionReason": "clothing_obscured | poor_lighting_or_blur | bad_framing | wrong_pose",
    "userFeedback": "Mensagem clara orientando ajuste (roupa justa esportiva, iluminação, enquadramento ou ângulo/pose correta)."
  },
  "spatialCalibration": {
    "detectedReferenceObjects": [],
    "perspectiveDistortionNote": "Não foi possível calibrar devido à qualidade/enquadramento da imagem.",
    "calibrationConfidence": "low"
  },
  "anthropometryEstimate": {
    "bmi": ${bmi},
    "estimatedBodyFatRange": { "min": 15, "max": 20 },
    "vTaperVisualScore": 50,
    "overallSymmetryScore": 50
  },
  "poseBreakdown": [],
  "physiqueSummary": "Imagem não avaliável.",
  "strongPoints": [],
  "weakPoints": [],
  "posturalObservations": [],
  "recommendedSplit": "Indisponível"
}`;

      const systemInstruction = buildPhysiqueSystemPrompt();
      const contents: Array<
        { text: string } | { inlineData: { data: string; mimeType: string } }
      > = [{ text: userPrompt }, ...poseParts];

      for (const modelName of modelsToTry) {
        try {
          const response = await this.callGeminiMultimodalWithTimeout(
            modelName,
            systemInstruction,
            contents,
            35000
          );

          const finishReason = response?.candidates?.[0]?.finishReason;
          const blockReason = response?.promptFeedback?.blockReason;
          if (
            blockReason ||
            finishReason === 'SAFETY' ||
            finishReason === 'PROHIBITED_CONTENT'
          ) {
            throw new HttpError(422, 'PHYSIQUE_IMAGE_NOT_ASSESSABLE', {
              message:
                'As fotos foram bloqueadas pelos filtros de segurança da IA. Use trajes esportivos justos (bermuda/sunga de pose/top) em ambiente bem iluminado e enquadramento claro.',
              rejectionReason: 'bad_framing',
              imageQualityCheck: {
                isAssessable: false,
                rejectionReason: 'bad_framing',
                userFeedback:
                  'As fotos foram bloqueadas pelos filtros de segurança da IA. Use trajes esportivos justos (bermuda/sunga de pose/top) e boa iluminação.',
              },
            });
          }

          const rawText = response.text?.trim();
          if (!rawText) continue;

          const rawJson = JSON.parse(rawText);
          const normalized = this.normalizeAiResult(
            rawJson,
            bmi,
            submittedSlots,
            previousContext
          );
          const validated = PhysiqueAssessmentResultSchema.parse(normalized);

          if (!validated.imageQualityCheck.isAssessable) {
            const feedback =
              validated.imageQualityCheck.userFeedback ||
              'Não foi possível avaliar as fotos enviadas. Use trajes esportivos justos, boa iluminação e enquadramento completo.';
            throw new HttpError(422, 'PHYSIQUE_IMAGE_NOT_ASSESSABLE', {
              message: feedback,
              rejectionReason: validated.imageQualityCheck.rejectionReason,
              imageQualityCheck: validated.imageQualityCheck,
            });
          }

          assessmentResult = validated;
          modelUsed = response?.modelVersion
            ? `${modelName} (${response.modelVersion})`
            : modelName;
          break;
        } catch (err: any) {
          if (err instanceof HttpError && err.status === 422) {
            throw err;
          }
          const errMsg = String(err?.message || err || '');
          if (
            errMsg.includes('SAFETY') ||
            errMsg.includes('PROHIBITED') ||
            errMsg.includes('blocked')
          ) {
            throw new HttpError(422, 'PHYSIQUE_IMAGE_NOT_ASSESSABLE', {
              message:
                'As fotos foram bloqueadas pelos filtros de segurança da IA. Utilize trajes esportivos justos (bermuda/sunga de pose/top) e boa iluminação.',
              rejectionReason: 'bad_framing',
              imageQualityCheck: {
                isAssessable: false,
                rejectionReason: 'bad_framing',
                userFeedback:
                  'As fotos foram bloqueadas pelos filtros de segurança da IA. Utilize trajes esportivos justos e boa iluminação.',
              },
            });
          }
          console.warn(
            `[PhysiqueService] Model ${modelName} failed:`,
            err?.message || err
          );
        }
      }

      if (!assessmentResult) {
        throw new HttpError(503, 'PHYSIQUE_AI_UNAVAILABLE', {
          message:
            'Não foi possível concluir a análise das fotos pela IA no momento. Nenhuma imagem foi salva e sua cota semanal não foi consumida. Por favor, tente novamente em alguns instantes.',
        });
      }
    } finally {
      // Descarte imediato em memória: garante que nenhum base64 permaneça referenciado
      poseParts.forEach((part) => {
        if ('inlineData' in part) {
          part.inlineData.data = '';
        }
      });
      poseParts = [];
      if (Array.isArray(input.poses)) {
        input.poses.forEach((p) => {
          p.base64 = '';
        });
        input.poses.length = 0;
      }
    }

    const saved = await PhysiqueAssessmentModel.create({
      userId,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      goal: input.goal,
      biologicalSex: input.biologicalSex,
      age: input.age,
      result: assessmentResult,
      modelUsed,
    });

    return saved;
  }

  async listAssessments(userId: string): Promise<IPhysiqueAssessmentDocument[]> {
    return PhysiqueAssessmentModel.find(scopedFilter(userId))
      .sort({ createdAt: -1 })
      .limit(20);
  }

  async getAssessmentById(
    userId: string,
    assessmentId: string
  ): Promise<IPhysiqueAssessmentDocument> {
    const assessment = await PhysiqueAssessmentModel.findOne(
      scopedFilter(userId, { _id: assessmentId })
    );
    if (!assessment) {
      throw new HttpError(404, 'PHYSIQUE_ASSESSMENT_NOT_FOUND', {
        message: 'Avaliação física não encontrada.',
      });
    }
    return assessment;
  }

  async generateCorrectionPlan(
    userId: string,
    assessmentId: string,
    options: GeneratePhysiquePlanInput = {}
  ) {
    const assessment = await this.getAssessmentById(userId, assessmentId);
    return strengthAIService.generatePhysiqueCorrectionPlan(
      userId,
      {
        goal: assessment.goal,
        result: assessment.result,
      },
      options
    );
  }

  private normalizeAiResult(
    raw: any,
    fallbackBmi: number,
    submittedSlots: PhysiqueCaptureSlot[],
    previousContext: PreviousComparisonContext | null
  ): any {
    const rawCheck = raw?.imageQualityCheck;
    const isAssessable =
      typeof rawCheck?.isAssessable === 'boolean' ? rawCheck.isAssessable : true;
    const rejectionReason: PhysiqueImageRejectionReason | undefined =
      !isAssessable &&
      PHYSIQUE_IMAGE_REJECTION_REASONS.includes(rawCheck?.rejectionReason)
        ? rawCheck.rejectionReason
        : !isAssessable
        ? 'poor_lighting_or_blur'
        : undefined;

    const imageQualityCheck = {
      isAssessable,
      ...(rejectionReason ? { rejectionReason } : {}),
      ...(rawCheck?.userFeedback ? { userFeedback: String(rawCheck.userFeedback) } : {}),
    };

    const rawBreakdownMap = new Map<PhysiqueCaptureSlot, PhysiquePoseBreakdownItem>();
    if (Array.isArray(raw?.poseBreakdown)) {
      for (const item of raw.poseBreakdown) {
        const poseType = normalizeCaptureSlot(item?.poseType);
        if (!poseType) continue;
        const defaults = SLOT_EVALUATION_DEFAULTS[poseType];
        rawBreakdownMap.set(poseType, {
          poseType,
          muscularAnalysis: String(item?.muscularAnalysis || defaults.analysis),
          posingExecutionTip: String(item?.posingExecutionTip || defaults.tip),
        });
      }
    }

    const poseBreakdown: PhysiquePoseBreakdownItem[] = isAssessable
      ? submittedSlots.map((poseType) => {
          const matched = rawBreakdownMap.get(poseType);
          if (matched) return matched;
          const defaults = SLOT_EVALUATION_DEFAULTS[poseType];
          return {
            poseType,
            muscularAnalysis: defaults.analysis,
            posingExecutionTip: defaults.tip,
          };
        })
      : [];

    const strongPoints = Array.isArray(raw?.strongPoints)
      ? raw.strongPoints.map((sp: any) => ({
          muscleGroup: normalizeMuscleGroup(sp.muscleGroup),
          note: String(sp.note || 'Bom desenvolvimento relativo.'),
        }))
      : [];

    const weakPoints =
      Array.isArray(raw?.weakPoints) && raw.weakPoints.length > 0
        ? raw.weakPoints.map((wp: any) => {
            const group = normalizeMuscleGroup(wp.muscleGroup);
            const rawPoses = Array.isArray(wp.detectedInPoses)
              ? wp.detectedInPoses
                  .map((p: any) => normalizeCaptureSlot(String(p)))
                  .filter(
                    (p: PhysiqueCaptureSlot | null): p is PhysiqueCaptureSlot =>
                      p !== null && submittedSlots.includes(p)
                  )
              : [];
            return {
              muscleGroup: group,
              subRegion: String(
                wp.subRegion || `Porção principal de ${group}`
              ),
              priority: wp.priority === 'medium' ? 'medium' : 'high',
              detectedInPoses:
                rawPoses.length > 0 ? rawPoses : [submittedSlots[0]],
              technicalReason: String(
                wp.technicalReason ||
                  'Volume adicional recomendado para equilíbrio estético e simetria.'
              ),
              targetWeeklySets: Math.min(
                30,
                Math.max(4, Math.round(Number(wp.targetWeeklySets) || 14))
              ),
              recommendedExerciseNames:
                Array.isArray(wp.recommendedExerciseNames) &&
                wp.recommendedExerciseNames.length > 0
                  ? wp.recommendedExerciseNames.map(String)
                  : ['Exercício composto prioritário'],
            };
          })
        : [];

    const minBf = Math.min(
      55,
      Math.max(4, Number(raw?.anthropometryEstimate?.estimatedBodyFatRange?.min) || 12)
    );
    const maxBf = Math.min(
      60,
      Math.max(
        minBf + 1,
        Number(raw?.anthropometryEstimate?.estimatedBodyFatRange?.max) || minBf + 3
      )
    );

    const vTaperVisualScore = Math.min(
      100,
      Math.max(0, Math.round(Number(raw?.anthropometryEstimate?.vTaperVisualScore) || 74))
    );
    const overallSymmetryScore = Math.min(
      100,
      Math.max(0, Math.round(Number(raw?.anthropometryEstimate?.overallSymmetryScore) || 76))
    );

    const comparisonWithPrevious =
      isAssessable && previousContext
        ? {
            daysSinceLast: previousContext.daysSinceLast,
            weightDeltaKg: previousContext.weightDeltaKg,
            conditioningEvolutionNote: String(
              raw?.comparisonWithPrevious?.conditioningEvolutionNote ||
                `Peso variou ${
                  previousContext.weightDeltaKg >= 0 ? '+' : ''
                }${previousContext.weightDeltaKg} kg em ${
                  previousContext.daysSinceLast
                } dia(s); faixa atual estimada em ${minBf}–${maxBf}%.`
            ),
            weakPointsProgress: String(
              raw?.comparisonWithPrevious?.weakPointsProgress ||
                'Comparativo registrado com base nos pontos fracos do laudo anterior.'
            ),
          }
        : undefined;

    return {
      imageQualityCheck,
      spatialCalibration: {
        detectedReferenceObjects: Array.isArray(
          raw?.spatialCalibration?.detectedReferenceObjects
        )
          ? raw.spatialCalibration.detectedReferenceObjects.map(String)
          : [],
        perspectiveDistortionNote: String(
          raw?.spatialCalibration?.perspectiveDistortionNote ||
            'Calibrado com base na altura informada e linhas verticais do ambiente.'
        ),
        calibrationConfidence: ['high', 'medium', 'low'].includes(
          raw?.spatialCalibration?.calibrationConfidence
        )
          ? raw.spatialCalibration.calibrationConfidence
          : 'medium',
      },
      anthropometryEstimate: {
        bmi: Number(raw?.anthropometryEstimate?.bmi) || fallbackBmi,
        estimatedBodyFatRange: {
          min: minBf,
          max: maxBf,
        },
        vTaperVisualScore,
        overallSymmetryScore,
      },
      poseBreakdown,
      physiqueSummary: String(
        raw?.physiqueSummary || 'Avaliação física calibrada concluída.'
      ),
      strongPoints,
      weakPoints,
      posturalObservations: Array.isArray(raw?.posturalObservations)
        ? raw.posturalObservations.map(String)
        : [],
      recommendedSplit: String(
        raw?.recommendedSplit ||
          'Upper / Lower com prioridade nos pontos fracos no início das sessões.'
      ),
      ...(comparisonWithPrevious ? { comparisonWithPrevious } : {}),
    };
  }
}

export const physiqueService = new PhysiqueService();

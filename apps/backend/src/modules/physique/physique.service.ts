import { GoogleGenAI } from '@google/genai';
import {
  BODYBUILDING_POSES,
  MUSCLE_GROUPS,
  PHYSIQUE_IMAGE_REJECTION_REASONS,
  PhysiqueAssessmentResultSchema,
  type BiologicalSex,
  type BodybuildingPose,
  type CreatePhysiqueAssessmentInput,
  type GeneratePhysiquePlanInput,
  type MuscleGroup,
  type PhysiqueAssessmentResult,
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

const POSE_LABELS_PT: Record<BodybuildingPose, string> = {
  front_double_biceps: 'Duplo Bíceps de Frente',
  side_chest: 'Peitoral Melhor Lado',
  back_double_biceps: 'Bíceps de Costas',
  side_triceps: 'Lado Tríceps',
  abs_and_thighs: 'Abdominais e Coxa',
};

const POSE_EVALUATION_DEFAULTS: Record<
  BodybuildingPose,
  { analysis: string; tip: string }
> = {
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

function normalizePoseType(raw: string): BodybuildingPose | null {
  const normalized = (raw || '').toLowerCase().trim();
  if ((BODYBUILDING_POSES as readonly string[]).includes(normalized)) {
    return normalized as BodybuildingPose;
  }
  return null;
}

function buildPhysiqueSystemPrompt(): string {
  return `Você é um Avaliador Físico de Fisiculturismo, Juiz Técnico de Poses e Especialista em Telemetria Corporal do Pacelog.
Sua tarefa é analisar fotos das poses oficiais de fisiculturismo do atleta usando calibração fotogramétrica real e retornar EXCLUSIVAMENTE um JSON estruturado, objetivo e técnico (sem linguagem clínica/médica ou diagnósticos patológicos).

ETAPA 0 — CONTROLE DE QUALIDADE E POSE (OBRIGATÓRIO):
- Antes de avaliar o físico, verifique se cada foto permite leitura muscular clara e corresponde minimamente à pose declarada.
- Se a foto NÃO mostrar claramente a pose ou físico utilizável ('wrong_pose'), estiver extremamente escura/borrada ('poor_lighting_or_blur'), com enquadramento cortado demais ('bad_framing') ou com roupas largas/casacos ocultando a musculatura ('clothing_obscured'), retorne 'imageQualityCheck.isAssessable = false', informe 'rejectionReason' e um 'userFeedback' amigável orientando trajes esportivos justos (bermuda/sunga de pose/top), iluminação frontal/superior e execução clara da pose.

DIRETRIZES OBRIGATÓRIAS:
1. CALIBRAÇÃO FOTOGRAMÉTRICA:
   - Use 'heightCm', 'weightKg', 'biologicalSex' e 'age' como escala mestra vertical, volumétrica e referência fisiológica.
   - Identifique objetos de referência no ambiente (portas ~210cm, interruptores ~115cm, azulejos, espelhos, racks/anilhas de academia) em 'detectedReferenceObjects'.
   - Cruze a perspectiva desses objetos com a altura real para descontar distorções de ângulo/lente da câmera e registre em 'perspectiveDistortionNote' e 'calibrationConfidence' ('high', 'medium' ou 'low').

2. LEITURA ESPECÍFICA POR POSE DE FISICULTURISMO (gere 'poseBreakdown' para cada pose enviada):
   - 'front_double_biceps': avalie pico de bíceps, simetria de braços, abertura de dorsal frontal (V-taper), linha de cintura e volume de quadríceps.
   - 'side_chest': avalie espessura peitoral (especialmente feixe clavicular/superior), deltoide anterior/lateral, braço de perfil, caixa torácica e curvatura de posterior de coxa/panturrilha.
   - 'back_double_biceps': avalie largura e inserção baixa de dorsais, densidade de trapézio/romboides, deltoide posterior, cabeça longa do tríceps, lombar, glúteo e posterior/panturrilha de costas.
   - 'side_triceps': avalie cabeça longa e lateral do tríceps ("ferradura"), separação de deltoide, controle de linha abdominal/oblíquos e cortes laterais de coxa.
   - 'abs_and_thighs': avalie profundidade dos blocos abdominais, serrátil anterior, oblíquos e separação das cabeças do quadríceps (vasto medial, lateral e reto femoral).
   - Em cada item de 'poseBreakdown', forneça também 'posingExecutionTip' corrigindo a execução da pose (ex.: altura de cotovelos, encaixe de escápula, ativação de coxa, expiração abdominal).

3. PONTOS FRACOS COM SUB-REGIÃO E RASTREAMENTO DE POSE:
   - Em 'weakPoints', identifique exatamente a sub-região anatômica em 'subRegion' (ex: "Peitoral superior (feixe clavicular)", "Deltoide posterior", "Cabeça longa do tríceps", "Vasto medial do quadríceps", "Largura de dorsal") e liste em 'detectedInPoses' em quais poses enviadas o déficit apareceu.
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
    let modelUsed = 'deterministic-fallback';

    const submittedPoses: BodybuildingPose[] = input.poses.map((p) => p.poseType);

    // Mantém referências efêmeras das poses apenas durante a chamada multimodal
    let poseParts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = input.poses.flatMap((pose) => [
      {
        text: `POSE ENVIADA: ${pose.poseType} (${POSE_LABELS_PT[pose.poseType]})`,
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

      if (this.ai) {
        const primaryModel = getValidGeminiModel(
          env.GEMINI_MODEL || PRIMARY_GEMINI_MODEL
        );
        const modelsToTry = Array.from(
          new Set([primaryModel, PRIMARY_GEMINI_MODEL, FALLBACK_GEMINI_MODEL])
        );

        const posesSummary = submittedPoses
          .map((p) => `${p} (${POSE_LABELS_PT[p]})`)
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
- Poses enviadas (${submittedPoses.length}): ${posesSummary}
${previousPromptBlock}
GRUPAMENTOS MUSCULARES PERMITIDOS EM 'muscleGroup':
${STRENGTH_MUSCLE_GROUPS.join(', ')}

POSES PERMITIDAS EM 'poseType' E 'detectedInPoses':
${BODYBUILDING_POSES.join(', ')}

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
      "poseType": "${submittedPoses[0]}",
      "muscularAnalysis": "Leitura muscular técnica específica da pose",
      "posingExecutionTip": "Correção biomecânica/estética para posar melhor (ex: altura dos cotovelos, encaixe de escápula, ativação de coxa)"
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
      "detectedInPoses": ["${submittedPoses[0]}"],
      "technicalReason": "Razão biomecânica/estética baseada nas poses avaliadas",
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
    "userFeedback": "Mensagem clara orientando ajuste (roupa justa esportiva, iluminação, enquadramento ou pose correta)."
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
              submittedPoses,
              previousContext
            );
            const validated = PhysiqueAssessmentResultSchema.parse(normalized);

            if (!validated.imageQualityCheck.isAssessable) {
              const feedback =
                validated.imageQualityCheck.userFeedback ||
                'Não foi possível avaliar as poses enviadas. Use trajes esportivos justos, boa iluminação e execute a pose solicitada por inteiro.';
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
      }

      if (!assessmentResult) {
        assessmentResult = this.buildDeterministicFallback(
          input,
          bmi,
          submittedPoses,
          previousContext
        );
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
    submittedPoses: BodybuildingPose[],
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

    const rawBreakdownMap = new Map<BodybuildingPose, PhysiquePoseBreakdownItem>();
    if (Array.isArray(raw?.poseBreakdown)) {
      for (const item of raw.poseBreakdown) {
        const poseType = normalizePoseType(item?.poseType);
        if (!poseType) continue;
        const defaults = POSE_EVALUATION_DEFAULTS[poseType];
        rawBreakdownMap.set(poseType, {
          poseType,
          muscularAnalysis: String(item?.muscularAnalysis || defaults.analysis),
          posingExecutionTip: String(item?.posingExecutionTip || defaults.tip),
        });
      }
    }

    const poseBreakdown: PhysiquePoseBreakdownItem[] = isAssessable
      ? submittedPoses.map((poseType) => {
          const matched = rawBreakdownMap.get(poseType);
          if (matched) return matched;
          const defaults = POSE_EVALUATION_DEFAULTS[poseType];
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
                  .map((p: any) => normalizePoseType(String(p)))
                  .filter(
                    (p: BodybuildingPose | null): p is BodybuildingPose =>
                      p !== null && submittedPoses.includes(p)
                  )
              : [];
            return {
              muscleGroup: group,
              subRegion: String(
                wp.subRegion || `Porção principal de ${group}`
              ),
              priority: wp.priority === 'medium' ? 'medium' : 'high',
              detectedInPoses:
                rawPoses.length > 0 ? rawPoses : [submittedPoses[0]],
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
        : isAssessable
        ? [
            {
              muscleGroup: 'ombros',
              subRegion: 'Deltoide lateral e posterior',
              priority: 'high',
              detectedInPoses: [submittedPoses[0]],
              technicalReason:
                'Maior largura de deltoides amplia o V-taper nas poses frontais e posteriores.',
              targetWeeklySets: 16,
              recommendedExerciseNames: ['Elevação Lateral (Halteres)'],
            },
          ]
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
        raw?.physiqueSummary || 'Avaliação física de poses calibrada concluída.'
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

  private buildDeterministicFallback(
    input: CreatePhysiqueAssessmentInput,
    bmi: number,
    submittedPoses: BodybuildingPose[],
    previousContext?: PreviousComparisonContext | null
  ): PhysiqueAssessmentResult {
    const rawBf =
      input.biologicalSex === 'female'
        ? 1.2 * bmi + 0.23 * input.age - 5.4
        : 1.2 * bmi + 0.23 * input.age - 16.2;

    const baseBf = Math.max(
      input.biologicalSex === 'female' ? 12 : 6,
      Math.min(42, Math.round(rawBf))
    );

    const pickDetected = (preferred: BodybuildingPose[]): BodybuildingPose[] => {
      const matched = preferred.filter((p) => submittedPoses.includes(p));
      return matched.length > 0 ? matched : [submittedPoses[0]];
    };

    const goalWeakPoints: Record<
      CreatePhysiqueAssessmentInput['goal'],
      PhysiqueAssessmentResult['weakPoints']
    > = {
      hypertrophy: [
        {
          muscleGroup: 'ombros',
          subRegion: 'Deltoide lateral e posterior',
          priority: 'high',
          detectedInPoses: pickDetected([
            'front_double_biceps',
            'back_double_biceps',
          ]),
          technicalReason: `Escala calibrada (${input.heightCm} cm / ${input.weightKg} kg): ampliar o deltoide lateral e posterior potencializa o V-taper frontal e dorsal.`,
          targetWeeklySets: 16,
          recommendedExerciseNames: [
            'Elevação Lateral (Halteres)',
            'Crucifixo Invertido (Halteres)',
          ],
        },
        {
          muscleGroup: 'peito',
          subRegion: 'Peitoral superior (feixe clavicular)',
          priority: 'high',
          detectedInPoses: pickDetected(['side_chest', 'front_double_biceps']),
          technicalReason:
            'Preencher a região clavicular cria maior espessura torácica na pose Side Chest e transição com o deltoide anterior.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Supino Inclinado (Halteres)',
            'Crucifixo Inclinado (Halteres)',
          ],
        },
        {
          muscleGroup: 'panturrilhas',
          subRegion: 'Gastrocnêmio medial e sóleo',
          priority: 'medium',
          detectedInPoses: pickDetected(['side_chest', 'back_double_biceps']),
          technicalReason:
            'Volume distal dos membros inferiores equilibra a proporção entre braços e pernas nas poses laterais e posteriores.',
          targetWeeklySets: 12,
          recommendedExerciseNames: [
            'Panturrilha em Pé (Máquina)',
            'Panturrilha Sentado (Sóleo / Gêmeos)',
          ],
        },
      ],
      definition: [
        {
          muscleGroup: 'abdomen',
          subRegion: 'Linha média e serrátil anterior',
          priority: 'high',
          detectedInPoses: pickDetected(['abs_and_thighs', 'side_triceps']),
          technicalReason:
            'Sobrecarga progressiva na linha abdominal e controle de vacuum preservam a profundidade dos cortes durante déficit.',
          targetWeeklySets: 12,
          recommendedExerciseNames: [
            'Abdominal Crunch (Polia / Cabo)',
            'Stomach Vacuum (Core Profundo)',
          ],
        },
        {
          muscleGroup: 'ombros',
          subRegion: 'Deltoide lateral (cabeça acromial)',
          priority: 'medium',
          detectedInPoses: pickDetected(['front_double_biceps', 'side_triceps']),
          technicalReason:
            'Preservar densidade lateral mantém o aspecto de ombros arredondados mesmo com redução de glicogênio.',
          targetWeeklySets: 14,
          recommendedExerciseNames: ['Elevação Lateral (Polia / Cabo)'],
        },
      ],
      recomposition: [
        {
          muscleGroup: 'costas',
          subRegion: 'Largura de dorsal e inserção baixa',
          priority: 'high',
          detectedInPoses: pickDetected([
            'front_double_biceps',
            'back_double_biceps',
          ]),
          technicalReason:
            'Grupamento de alta demanda metabólica e impacto direto na relação ombro-cintura.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Puxada Frente Aberta (Polia)',
            'Remada Baixa (Triângulo / Polia)',
          ],
        },
        {
          muscleGroup: 'quadriceps',
          subRegion: 'Vasto medial e reto femoral',
          priority: 'medium',
          detectedInPoses: pickDetected([
            'abs_and_thighs',
            'front_double_biceps',
          ]),
          technicalReason:
            'Maior varredura lateral e definição próxima ao joelho melhoram o equilíbrio inferior.',
          targetWeeklySets: 14,
          recommendedExerciseNames: ['Agachamento Livre (Barra)', 'Cadeira Extensora'],
        },
      ],
      classic_physique: [
        {
          muscleGroup: 'costas',
          subRegion: 'Largura de dorsal e V-taper clássico',
          priority: 'high',
          detectedInPoses: pickDetected([
            'front_double_biceps',
            'back_double_biceps',
          ]),
          technicalReason:
            'Na estética Classic Physique, a amplitude de dorsal aliada à linha de cintura fina define a silhueta em X.',
          targetWeeklySets: 16,
          recommendedExerciseNames: [
            'Barra Fixa Pronada (Pull-up)',
            'Puxada Frente Aberta (Polia)',
          ],
        },
        {
          muscleGroup: 'abdomen',
          subRegion: 'Controle de cintura (Vacuum & oblíquos)',
          priority: 'high',
          detectedInPoses: pickDetected(['abs_and_thighs', 'side_triceps']),
          technicalReason:
            'Manter a parede abdominal profunda sem hipertrofia excessiva dos oblíquos protege a ilusão clássica.',
          targetWeeklySets: 10,
          recommendedExerciseNames: [
            'Stomach Vacuum (Core Profundo)',
            'Abdominal Infra Pendurado na Barra',
          ],
        },
        {
          muscleGroup: 'posteriores',
          subRegion: 'Curvatura de bíceps femoral',
          priority: 'medium',
          detectedInPoses: pickDetected(['side_chest', 'back_double_biceps']),
          technicalReason:
            'Proporção lateral entre quadríceps e posterior valoriza as poses de perfil.',
          targetWeeklySets: 12,
          recommendedExerciseNames: ['Stiff (Barra)', 'Mesa Flexora'],
        },
      ],
      mens_physique: [
        {
          muscleGroup: 'ombros',
          subRegion: 'Deltoide lateral e posterior (caping)',
          priority: 'high',
          detectedInPoses: pickDetected([
            'front_double_biceps',
            'back_double_biceps',
          ]),
          technicalReason:
            'No Men’s Physique, o arredondamento lateral e posterior dos deltoides determina a largura visual.',
          targetWeeklySets: 18,
          recommendedExerciseNames: [
            'Elevação Lateral (Polia / Cabo)',
            'Face Pull (Polia com Corda)',
          ],
        },
        {
          muscleGroup: 'peito',
          subRegion: 'Peitoral superior (feixe clavicular)',
          priority: 'high',
          detectedInPoses: pickDetected(['side_chest', 'front_double_biceps']),
          technicalReason:
            'Feixe superior preenchido cria destaque na transição clavícula-ombro.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Supino Inclinado (Halteres)',
            'Crossover (Polia Baixa)',
          ],
        },
      ],
      bodybuilding: [
        {
          muscleGroup: 'triceps',
          subRegion: 'Cabeça longa do tríceps (ferradura)',
          priority: 'high',
          detectedInPoses: pickDetected(['side_triceps', 'back_double_biceps']),
          technicalReason:
            'A cabeça longa preenche a parte inferior do braço de perfil e de costas, elevando a densidade do membro superior.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Tríceps Francês na Polia (Corda)',
            'Tríceps Testa (Barra W)',
          ],
        },
        {
          muscleGroup: 'posteriores',
          subRegion: 'Bíceps femoral e inserção glúteo-posterior',
          priority: 'high',
          detectedInPoses: pickDetected(['side_chest', 'back_double_biceps']),
          technicalReason:
            'Profundidade posterior garante equilíbrio 360° frente vs. costas.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Levantamento Romeno / RDL (Barra)',
            'Mesa Flexora',
          ],
        },
        {
          muscleGroup: 'costas',
          subRegion: 'Densidade de trapézio medial e romboides',
          priority: 'medium',
          detectedInPoses: pickDetected(['back_double_biceps']),
          technicalReason:
            'Maior espessura no miolo das costas eleva o detalhamento na contração dorsal traseira.',
          targetWeeklySets: 16,
          recommendedExerciseNames: [
            'Remada Curvada Pronada (Barra)',
            'Remada Cavalinho (Barra T)',
          ],
        },
      ],
    };

    const minBf = Math.max(input.biologicalSex === 'female' ? 11 : 5, baseBf - 2);
    const maxBf = Math.min(45, baseBf + 2);

    const poseBreakdown: PhysiquePoseBreakdownItem[] = submittedPoses.map(
      (poseType) => {
        const defaults = POSE_EVALUATION_DEFAULTS[poseType];
        return {
          poseType,
          muscularAnalysis: `${defaults.analysis} (Escala calibrada: ${input.heightCm} cm / ${input.weightKg} kg, objetivo ${input.goal}).`,
          posingExecutionTip: defaults.tip,
        };
      }
    );

    const vTaperVisualScore = Math.max(
      45,
      Math.min(95, Math.round(84 - Math.max(0, baseBf - 12) * 1.1))
    );
    const overallSymmetryScore = Math.max(
      50,
      Math.min(95, Math.round(78 + (submittedPoses.length >= 4 ? 4 : 0)))
    );

    const comparisonWithPrevious = previousContext
      ? (() => {
          const prevMidBf =
            (previousContext.result.anthropometryEstimate.estimatedBodyFatRange.min +
              previousContext.result.anthropometryEstimate.estimatedBodyFatRange.max) /
            2;
          const currMidBf = (minBf + maxBf) / 2;
          const bfDiff = Number((currMidBf - prevMidBf).toFixed(1));
          const prevWeakNames = previousContext.result.weakPoints
            .map((w) => w.subRegion || w.muscleGroup)
            .join(', ');
          return {
            daysSinceLast: previousContext.daysSinceLast,
            weightDeltaKg: previousContext.weightDeltaKg,
            conditioningEvolutionNote: `Tendência de BF% estimado: ${
              bfDiff > 0 ? `+${bfDiff}%` : `${bfDiff}%`
            } em relação à avaliação anterior (${previousContext.daysSinceLast}d atrás, peso ${
              previousContext.weightDeltaKg >= 0 ? '+' : ''
            }${previousContext.weightDeltaKg} kg).`,
            weakPointsProgress: `Acompanhamento contínuo em relação aos pontos fracos anteriores (${
              prevWeakNames || 'gerais'
            }).`,
          };
        })()
      : undefined;

    const sexLabel = input.biologicalSex === 'female' ? 'feminino' : 'masculino';

    return {
      imageQualityCheck: {
        isAssessable: true,
      },
      spatialCalibration: {
        detectedReferenceObjects: [
          'Escala antropométrica direta (altura e peso informados)',
        ],
        perspectiveDistortionNote: `Calibração estimada a partir da escala mestra de ${input.heightCm} cm e ${input.weightKg} kg (IMC ${bmi}, referência fisiológica ${sexLabel}, ${input.age} anos).`,
        calibrationConfidence: 'low',
      },
      anthropometryEstimate: {
        bmi,
        estimatedBodyFatRange: {
          min: minBf,
          max: maxBf,
        },
        vTaperVisualScore,
        overallSymmetryScore,
      },
      poseBreakdown,
      physiqueSummary: `Análise estruturada de ${submittedPoses.length} pose(s) para atleta (${sexLabel}, ${input.age} anos) de ${input.heightCm} cm e ${input.weightKg} kg (IMC ${bmi}) com foco em ${input.goal}.`,
      strongPoints: [
        {
          muscleGroup: 'peito',
          note: 'Base estrutural compatível para progressão de compostos de empurrar.',
        },
        {
          muscleGroup: 'quadriceps',
          note: 'Suporte adequado para progressão gradual de carga nos membros inferiores.',
        },
      ],
      weakPoints: goalWeakPoints[input.goal],
      posturalObservations: [
        'Manter depressão e retração escapular controlada nas poses de frente e costas.',
        'Garantir alinhamento neutro da pelve e ativação isométrica de quadríceps durante as poses.',
      ],
      recommendedSplit:
        'Upper / Lower (4x/semana) posicionando as sub-regiões deficitárias no início de cada sessão.',
      ...(comparisonWithPrevious ? { comparisonWithPrevious } : {}),
    };
  }
}

export const physiqueService = new PhysiqueService();

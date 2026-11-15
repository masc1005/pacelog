import { GoogleGenAI } from '@google/genai';
import {
  MUSCLE_GROUPS,
  PHYSIQUE_IMAGE_REJECTION_REASONS,
  PhysiqueAssessmentResultSchema,
  type BiologicalSex,
  type CreatePhysiqueAssessmentInput,
  type GeneratePhysiquePlanInput,
  type MuscleGroup,
  type PhysiqueAssessmentResult,
  type PhysiqueImageRejectionReason,
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

function computeAgeFromBirthDate(birthDate?: string): number | undefined {
  if (!birthDate) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date();
  let age = today.getUTCFullYear() - year;
  const monthDiff = today.getUTCMonth() + 1 - month;
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < day)) {
    age -= 1;
  }
  if (!Number.isFinite(age) || age < 14 || age > 110) return undefined;
  return age;
}

function buildPhysiqueSystemPrompt(): string {
  return `Você é um Avaliador Físico Biomecânico e Especialista em Telemetria Corporal do Pacelog.
Sua tarefa é analisar fotos do atleta (frente, costas e/ou perfil) usando fotogrametria calibrada e retornar EXCLUSIVAMENTE um JSON estruturado, objetivo e técnico (sem linguagem clínica/médica ou diagnósticos patológicos).

ETAPA 0 — CONTROLE DE QUALIDADE DA IMAGEM (OBRIGATÓRIO):
- Antes de avaliar o físico, verifique se há uma pessoa visível com contornos musculares minimamente legíveis.
- Se a foto NÃO mostrar uma pessoa ('no_person_detected'), estiver extremamente escura/borrada ('poor_lighting_or_blur'), com enquadramento inutilizável ('bad_framing') ou com roupas largas/casacos que ocultem totalmente o físico ('clothing_obscured'), retorne 'imageQualityCheck.isAssessable = false', informe 'rejectionReason' e um 'userFeedback' amigável orientando trajes esportivos justos (bermuda/shorts e top ou sem camisa) e boa iluminação.

DIRETRIZES OBRIGATÓRIAS DE CALIBRAÇÃO FOTOGRAMÉTRICA:
1. Use a altura real (heightCm), peso (weightKg), sexo biológico e idade informados como escala mestra vertical, volumétrica e referência fisiológica de percentual de gordura e simetria.
2. Inspecione o ambiente ao redor do usuário na imagem em busca de objetos de dimensão conhecida (batentes/portas de ~210cm, interruptores/tomadas a ~110-120cm do chão, pisos/azulejos, espelhos, bancos ou anilhas de academia) e liste-os em 'detectedReferenceObjects'.
3. Cruze a perspectiva das linhas verticais desses objetos com a altura real do usuário para descontar distorções de lente grande-angular e inclinação da câmera (evitando falsos diagnósticos de membros curtos ou assimetrias causadas pelo ângulo da foto). Descreva essa compensação em 'perspectiveDistortionNote' e atribua 'calibrationConfidence' ('high', 'medium' ou 'low').
4. Avalie os grupamentos musculares oficiais (${STRENGTH_MUSCLE_GROUPS.join(', ')}) considerando proporção, densidade, simetria e alinhamento postural, e retorne estritamente o JSON validado pelo contrato abaixo.`;
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

    // Mantém referências efêmeras das imagens apenas durante a chamada multimodal
    let imageParts: Array<{ inlineData: { data: string; mimeType: string } }> =
      input.images.map((img) => ({
        inlineData: {
          data: stripBase64Prefix(img.base64),
          mimeType: img.mimeType,
        },
      }));

    let resolvedSex: BiologicalSex | undefined = input.biologicalSex;
    let resolvedAge: number | undefined =
      input.age ?? computeAgeFromBirthDate(input.birthDate);

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

      // 2. Carrega perfil existente + última avaliação válida em paralelo
      const [existingProfile, previousDoc] = await Promise.all([
        ProfileModel.findOne(scopedFilter(userId)).lean().catch(() => null),
        PhysiqueAssessmentModel.findOne(
          scopedFilter(userId, {
            'result.imageQualityCheck.isAssessable': { $ne: false },
          })
        )
          .sort({ createdAt: -1 })
          .lean()
          .catch(() => null),
      ]);

      resolvedSex = resolvedSex ?? existingProfile?.biologicalSex;
      resolvedAge =
        resolvedAge ?? computeAgeFromBirthDate(existingProfile?.birthDate);

      // Atualiza altura, peso e contexto biológico no perfil caso informados
      const profileUpdate: Record<string, any> = {
        heightCm: input.heightCm,
        currentWeightKg: input.weightKg,
      };
      if (input.biologicalSex) profileUpdate.biologicalSex = input.biologicalSex;
      if (input.birthDate) profileUpdate.birthDate = input.birthDate;

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

        const anglesSummary = input.images.map((i) => i.angle).join(', ');
        const biologicalContextLines = [
          `- Sexo biológico: ${
            resolvedSex === 'male'
              ? 'Masculino'
              : resolvedSex === 'female'
              ? 'Feminino'
              : 'Não informado'
          }`,
          `- Idade: ${resolvedAge !== undefined ? `${resolvedAge} anos` : 'Não informada'}`,
        ].join('\n');

        const previousPromptBlock = previousContext
          ? `\nHISTÓRICO EVOLUTIVO DO ATLETA (laudo anterior de ${previousContext.daysSinceLast} dias atrás, sem fotos armazenadas):
${JSON.stringify({
  daysSinceLast: previousContext.daysSinceLast,
  previousWeightKg: previousContext.weightKg,
  currentWeightKg: input.weightKg,
  weightDeltaKg: previousContext.weightDeltaKg,
  previousBodyFatRange: previousContext.result.anthropometryEstimate?.estimatedBodyFatRange,
  previousStrongPoints: previousContext.result.strongPoints,
  previousWeakPoints: previousContext.result.weakPoints?.map((w) => ({
    muscleGroup: w.muscleGroup,
    priority: w.priority,
    technicalReason: w.technicalReason,
  })),
  previousSummary: previousContext.result.physiqueSummary,
})}
IMPORTANTE: Como existe avaliação anterior, PREENCHA obrigatoriamente o campo 'comparisonWithPrevious' comparando a composição atual com a anterior.\n`
          : '\nNão há avaliação anterior salva. NÃO inclua o campo comparisonWithPrevious (ou deixe omitido).\n';

        const userPrompt = `DADOS DE CALIBRAÇÃO DO ATLETA:
- Altura real (escala mestra vertical): ${input.heightCm} cm
- Peso atual: ${input.weightKg} kg
- IMC calculado: ${bmi}
${biologicalContextLines}
- Objetivo declarado: ${input.goal}
- Ângulos enviados: ${anglesSummary}
${previousPromptBlock}
GRUPAMENTOS MUSCULARES PERMITIDOS (use exatamente estas chaves em 'muscleGroup'):
${STRENGTH_MUSCLE_GROUPS.join(', ')}

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "imageQualityCheck": {
    "isAssessable": true,
    "rejectionReason": null,
    "userFeedback": null
  },
  "spatialCalibration": {
    "detectedReferenceObjects": ["objeto 1 (ex: batente de porta ~210cm)", "objeto 2"],
    "perspectiveDistortionNote": "Explicação objetiva da inclinação/lente da câmera e como foi descontada pela altura real de ${input.heightCm} cm",
    "calibrationConfidence": "high | medium | low"
  },
  "anthropometryEstimate": {
    "bmi": ${bmi},
    "estimatedBodyFatRange": { "min": 12, "max": 16 },
    "waistToShoulderVisualRatio": "Ex: 1:1.45 (V-taper moderado)"
  },
  "physiqueSummary": "Leitura técnica geral de proporção, densidade muscular e simetria.",
  "strongPoints": [
    { "muscleGroup": "peito", "note": "Observação técnica objetiva" }
  ],
  "weakPoints": [
    {
      "muscleGroup": "ombros",
      "priority": "high | medium",
      "technicalReason": "Razão biomecânica/visual baseada na proporção calibrada",
      "targetWeeklySets": 16,
      "recommendedExerciseNames": ["Elevação Lateral (Halteres)", "Desenvolvimento Sentado (Halteres)"]
    }
  ],
  "posturalObservations": [
    "Observação curta sobre alinhamento de ombros, escápulas, pelve ou joelhos"
  ],
  "recommendedSplit": "Sugestão objetiva de divisão semanal priorizando os pontos fracos"${
    previousContext
      ? `,
  "comparisonWithPrevious": {
    "daysSinceLast": ${previousContext.daysSinceLast},
    "weightDeltaKg": ${previousContext.weightDeltaKg},
    "bodyFatDeltaNote": "Comparativo objetivo da evolução do percentual de gordura estimado",
    "weakPointsProgress": "Evolução perceptível dos pontos fracos anteriores"
  }`
      : ''
  }
}

Se a imagem NÃO for avaliável, retorne:
{
  "imageQualityCheck": {
    "isAssessable": false,
    "rejectionReason": "clothing_obscured | poor_lighting_or_blur | bad_framing | no_person_detected",
    "userFeedback": "Mensagem clara e amigável explicando exatamente o que ajustar na foto (ex: usar trajes esportivos justos como shorts/bermuda e top ou sem camisa, melhorar iluminação ou enquadramento)."
  },
  "spatialCalibration": {
    "detectedReferenceObjects": [],
    "perspectiveDistortionNote": "Não foi possível calibrar devido à qualidade/enquadramento da imagem.",
    "calibrationConfidence": "low"
  },
  "anthropometryEstimate": {
    "bmi": ${bmi},
    "estimatedBodyFatRange": { "min": 15, "max": 20 },
    "waistToShoulderVisualRatio": "Indisponível"
  },
  "physiqueSummary": "Imagem não avaliável.",
  "strongPoints": [],
  "weakPoints": [],
  "posturalObservations": [],
  "recommendedSplit": "Indisponível"
}`;

        const systemInstruction = buildPhysiqueSystemPrompt();
        const contents: Array<
          { text: string } | { inlineData: { data: string; mimeType: string } }
        > = [{ text: userPrompt }, ...imageParts];

        for (const modelName of modelsToTry) {
          try {
            const response = await this.callGeminiMultimodalWithTimeout(
              modelName,
              systemInstruction,
              contents,
              30000
            );

            // Detecta bloqueio explícito pelos filtros de segurança do Gemini
            const finishReason = response?.candidates?.[0]?.finishReason;
            const blockReason = response?.promptFeedback?.blockReason;
            if (
              blockReason ||
              finishReason === 'SAFETY' ||
              finishReason === 'PROHIBITED_CONTENT'
            ) {
              throw new HttpError(422, 'PHYSIQUE_IMAGE_NOT_ASSESSABLE', {
                message:
                  'As fotos foram bloqueadas pelos filtros de segurança da IA. Use trajes esportivos justos (bermuda/shorts de treino e top ou sem camisa) em ambiente bem iluminado e evite poses ou cortes ambíguos.',
                rejectionReason: 'bad_framing',
                imageQualityCheck: {
                  isAssessable: false,
                  rejectionReason: 'bad_framing',
                  userFeedback:
                    'As fotos foram bloqueadas pelos filtros de segurança da IA. Use trajes esportivos justos (bermuda/shorts de treino e top ou sem camisa) em ambiente bem iluminado.',
                },
              });
            }

            const rawText = response.text?.trim();
            if (!rawText) continue;

            const rawJson = JSON.parse(rawText);
            const normalized = this.normalizeAiResult(
              rawJson,
              bmi,
              previousContext
            );
            const validated = PhysiqueAssessmentResultSchema.parse(normalized);

            if (!validated.imageQualityCheck.isAssessable) {
              const feedback =
                validated.imageQualityCheck.userFeedback ||
                'Não foi possível avaliar o físico nas fotos enviadas. Use trajes esportivos justos (bermuda/shorts e top ou sem camisa), boa iluminação e enquadramento completo.';
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
                  'As fotos foram bloqueadas pelos filtros de segurança da IA. Utilize trajes esportivos justos (shorts/bermuda de treino, top ou sem camisa) e boa iluminação.',
                rejectionReason: 'bad_framing',
                imageQualityCheck: {
                  isAssessable: false,
                  rejectionReason: 'bad_framing',
                  userFeedback:
                    'As fotos foram bloqueadas pelos filtros de segurança da IA. Utilize trajes esportivos justos (shorts/bermuda de treino, top ou sem camisa) e boa iluminação.',
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
          resolvedSex,
          resolvedAge,
          previousContext
        );
      }
    } finally {
      // Descarte imediato em memória: garante que nenhum base64 permaneça referenciado
      imageParts.forEach((p) => {
        p.inlineData.data = '';
      });
      imageParts = [];
      if (Array.isArray(input.images)) {
        input.images.forEach((img) => {
          img.base64 = '';
        });
        input.images.length = 0;
      }
    }

    const saved = await PhysiqueAssessmentModel.create({
      userId,
      heightCm: input.heightCm,
      weightKg: input.weightKg,
      goal: input.goal,
      ...(resolvedSex ? { biologicalSex: resolvedSex } : {}),
      ...(resolvedAge !== undefined ? { age: resolvedAge } : {}),
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

    const strongPoints = Array.isArray(raw?.strongPoints)
      ? raw.strongPoints.map((sp: any) => ({
          muscleGroup: normalizeMuscleGroup(sp.muscleGroup),
          note: String(sp.note || 'Bom desenvolvimento relativo.'),
        }))
      : [];

    const weakPoints =
      Array.isArray(raw?.weakPoints) && raw.weakPoints.length > 0
        ? raw.weakPoints.map((wp: any) => ({
            muscleGroup: normalizeMuscleGroup(wp.muscleGroup),
            priority: wp.priority === 'medium' ? 'medium' : 'high',
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
          }))
        : isAssessable
        ? [
            {
              muscleGroup: 'ombros',
              priority: 'high',
              technicalReason:
                'Maior largura de deltoides melhora a relação cintura-ombros.',
              targetWeeklySets: 16,
              recommendedExerciseNames: ['Elevação Lateral (Halteres)'],
            },
          ]
        : [];

    const minBf = Math.min(
      55,
      Math.max(4, Number(raw?.anthropometryEstimate?.estimatedBodyFatRange?.min) || 14)
    );
    const maxBf = Math.min(
      60,
      Math.max(
        minBf + 1,
        Number(raw?.anthropometryEstimate?.estimatedBodyFatRange?.max) || minBf + 4
      )
    );

    const comparisonWithPrevious =
      isAssessable && previousContext
        ? {
            daysSinceLast: previousContext.daysSinceLast,
            weightDeltaKg: previousContext.weightDeltaKg,
            bodyFatDeltaNote: String(
              raw?.comparisonWithPrevious?.bodyFatDeltaNote ||
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
        waistToShoulderVisualRatio: String(
          raw?.anthropometryEstimate?.waistToShoulderVisualRatio ||
            'Proporção equilibrada'
        ),
      },
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

  private buildDeterministicFallback(
    input: CreatePhysiqueAssessmentInput,
    bmi: number,
    biologicalSex?: BiologicalSex,
    age?: number,
    previousContext?: PreviousComparisonContext | null
  ): PhysiqueAssessmentResult {
    const refAge = age ?? 28;
    const rawBf =
      biologicalSex === 'female'
        ? 1.2 * bmi + 0.23 * refAge - 5.4
        : biologicalSex === 'male'
        ? 1.2 * bmi + 0.23 * refAge - 16.2
        : (bmi - 10) * 1.1;

    const baseBf = Math.max(
      biologicalSex === 'female' ? 12 : 6,
      Math.min(42, Math.round(rawBf))
    );

    const goalWeakPoints: Record<
      CreatePhysiqueAssessmentInput['goal'],
      PhysiqueAssessmentResult['weakPoints']
    > = {
      hypertrophy: [
        {
          muscleGroup: 'ombros',
          priority: 'high',
          technicalReason: `Escala calibrada (${input.heightCm} cm / ${input.weightKg} kg): priorizar porção lateral e posterior dos deltoides amplia o V-taper.`,
          targetWeeklySets: 16,
          recommendedExerciseNames: [
            'Elevação Lateral (Halteres)',
            'Desenvolvimento Sentado (Halteres)',
          ],
        },
        {
          muscleGroup: 'costas',
          priority: 'high',
          technicalReason:
            'Maior densidade e largura de dorsal equilibram a linha de tronco e postura torácica.',
          targetWeeklySets: 16,
          recommendedExerciseNames: [
            'Puxada Frente Aberta (Polia)',
            'Remada Curvada Pronada (Barra)',
          ],
        },
        {
          muscleGroup: 'panturrilhas',
          priority: 'medium',
          technicalReason:
            'Desenvolvimento distal dos membros inferiores melhora a simetria geral.',
          targetWeeklySets: 12,
          recommendedExerciseNames: ['Panturrilha em Pé (Máquina / Smith)'],
        },
      ],
      definition: [
        {
          muscleGroup: 'abdomen',
          priority: 'high',
          technicalReason:
            'Fortalecimento com sobrecarga progressiva preserva profundidade da linha média durante déficit calórico.',
          targetWeeklySets: 12,
          recommendedExerciseNames: ['Abdominal Supra na Polia (Crunch)'],
        },
        {
          muscleGroup: 'ombros',
          priority: 'medium',
          technicalReason:
            'Manter volume de deltoides preserva aparência de largura e separação muscular.',
          targetWeeklySets: 14,
          recommendedExerciseNames: ['Elevação Lateral (Polia / Cabo)'],
        },
      ],
      recomposition: [
        {
          muscleGroup: 'costas',
          priority: 'high',
          technicalReason:
            'Grupamento de alta demanda metabólica e impacto direto na proporção ombro-cintura.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Puxada Frente Aberta (Polia)',
            'Remada Baixa (Triângulo / Polia)',
          ],
        },
        {
          muscleGroup: 'quadriceps',
          priority: 'medium',
          technicalReason:
            'Base de membros inferiores acelera gasto energético e equilibra o físico.',
          targetWeeklySets: 14,
          recommendedExerciseNames: ['Agachamento Livre (Barra)', 'Leg Press 45°'],
        },
      ],
      athletic: [
        {
          muscleGroup: 'posteriores',
          priority: 'high',
          technicalReason:
            'Cadeia posterior forte otimiza potência de corrida, saltos e estabilidade pélvica.',
          targetWeeklySets: 14,
          recommendedExerciseNames: [
            'Stiff / Levantamento Terra Romeno (Barra)',
            'Mesa Flexora',
          ],
        },
        {
          muscleGroup: 'abdomen',
          priority: 'medium',
          technicalReason:
            'Estabilidade anti-rotacional e transferência de força entre membros.',
          targetWeeklySets: 12,
          recommendedExerciseNames: ['Prancha Abdominal (Plank)'],
        },
      ],
    };

    const minBf = Math.max(biologicalSex === 'female' ? 11 : 5, baseBf - 2);
    const maxBf = Math.min(45, baseBf + 2);

    const comparisonWithPrevious = previousContext
      ? (() => {
          const prevMidBf =
            (previousContext.result.anthropometryEstimate.estimatedBodyFatRange.min +
              previousContext.result.anthropometryEstimate.estimatedBodyFatRange.max) /
            2;
          const currMidBf = (minBf + maxBf) / 2;
          const bfDiff = Number((currMidBf - prevMidBf).toFixed(1));
          const prevWeakNames = previousContext.result.weakPoints
            .map((w) => w.muscleGroup)
            .join(', ');
          return {
            daysSinceLast: previousContext.daysSinceLast,
            weightDeltaKg: previousContext.weightDeltaKg,
            bodyFatDeltaNote: `Tendência de BF% estimado: ${
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

    const sexLabel =
      biologicalSex === 'female'
        ? 'feminino'
        : biologicalSex === 'male'
        ? 'masculino'
        : 'geral';
    const ageLabel = age !== undefined ? `, ${age} anos` : '';

    return {
      imageQualityCheck: {
        isAssessable: true,
      },
      spatialCalibration: {
        detectedReferenceObjects: [
          'Escala antropométrica direta (altura e peso informados)',
        ],
        perspectiveDistortionNote: `Calibração estimada a partir da escala mestra de ${input.heightCm} cm e ${input.weightKg} kg (IMC ${bmi}, referência fisiológica ${sexLabel}${ageLabel}).`,
        calibrationConfidence: 'low',
      },
      anthropometryEstimate: {
        bmi,
        estimatedBodyFatRange: {
          min: minBf,
          max: maxBf,
        },
        waistToShoulderVisualRatio:
          biologicalSex === 'female'
            ? 'Estimativa base via antropometria (1:1.25 – 1:1.35)'
            : 'Estimativa base via antropometria (1:1.35 – 1:1.45)',
      },
      physiqueSummary: `Análise estruturada para atleta (${sexLabel}${ageLabel}) de ${input.heightCm} cm e ${input.weightKg} kg (IMC ${bmi}) com foco em ${input.goal}.`,
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
        'Manter retração escapular controlada em movimentos de empurrar e puxar.',
        'Garantir alinhamento neutro da pelve e coluna lombar sob carga axial.',
      ],
      recommendedSplit:
        'Upper / Lower (4x/semana) posicionando os pontos fracos como primeiros exercícios de cada sessão.',
      ...(comparisonWithPrevious ? { comparisonWithPrevious } : {}),
    };
  }
}

export const physiqueService = new PhysiqueService();

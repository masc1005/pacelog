import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Dumbbell,
  History,
  Ruler,
  Scale,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import type {
  BiologicalSex,
  BodybuildingPose,
  GeneratePhysiquePlanMode,
  MuscleGroup,
  PhysiqueAssessmentDTO,
  PhysiqueAssessmentGoal,
  PhysiquePoseInput,
  StrengthRoutineDTO,
} from '@pacelog/shared';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { apiClient } from '../../../lib/api';
import { readinessApi } from '../../../services/readiness.api';
import { physiqueApi } from '../../../services/physique.api';
import { useToast } from '../../../contexts/ToastContext';
import type { UserProfile } from '../../../types/user.types';
import { compressImageToBase64 } from '../utils/imageCompression';

interface PhysiqueAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHeightSaved?: (heightCm: number) => void;
  onPlanGenerated?: (routines: StrengthRoutineDTO[]) => void;
}

interface EphemeralPoseDraft extends PhysiquePoseInput {
  previewUrl: string;
}

const POSE_META: Array<{
  poseType: BodybuildingPose;
  label: string;
  contractionTip: string;
}> = [
  {
    poseType: 'front_double_biceps',
    label: 'Duplo Bíceps de Frente',
    contractionTip:
      'Cotovelos na linha dos ombros, punhos fechados, dorsais abertas e quadríceps travados.',
  },
  {
    poseType: 'side_chest',
    label: 'Peitoral Melhor Lado',
    contractionTip:
      'De perfil, pressione o braço da frente contra o tronco expandindo o peitoral e contraia posterior/panturrilha.',
  },
  {
    poseType: 'back_double_biceps',
    label: 'Bíceps de Costas',
    contractionTip:
      'Incline ~10° para trás, abra as dorsais antes de fechar as escápulas e contraia glúteos e panturrilhas.',
  },
  {
    poseType: 'side_triceps',
    label: 'Lado Tríceps',
    contractionTip:
      'Gire o ombro da frente para trás exibindo a ferradura do tríceps, abdômen travado e perna contraída.',
  },
  {
    poseType: 'abs_and_thighs',
    label: 'Abdominais e Coxa',
    contractionTip:
      'Mãos atrás da cabeça, expire contraindo o abdômen e projete uma perna à frente travando o quadríceps.',
  },
];

const POSE_LABELS: Record<BodybuildingPose, string> = {
  front_double_biceps: 'Duplo Bíceps de Frente',
  side_chest: 'Peitoral Melhor Lado',
  back_double_biceps: 'Bíceps de Costas',
  side_triceps: 'Lado Tríceps',
  abs_and_thighs: 'Abdominais e Coxa',
};

const GOAL_OPTIONS: Array<{ value: PhysiqueAssessmentGoal; label: string }> = [
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'definition', label: 'Definição' },
  { value: 'recomposition', label: 'Recomposição' },
  { value: 'classic_physique', label: 'Classic Physique' },
  { value: 'mens_physique', label: "Men's Physique" },
  { value: 'bodybuilding', label: 'Bodybuilding' },
];

const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  peito: 'Peito',
  costas: 'Costas / Dorsal',
  ombros: 'Ombros / Deltoides',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  quadriceps: 'Quadríceps',
  posteriores: 'Posteriores',
  gluteos: 'Glúteos',
  panturrilhas: 'Panturrilhas',
  abdomen: 'Abdômen / Core',
  corpo_inteiro: 'Corpo Inteiro',
  mobilidade: 'Mobilidade',
  cardio: 'Cardio',
};

const CONFIDENCE_STYLES = {
  high: { label: 'Calibração Alta', color: 'text-[#D4F684] bg-[#D4F684]/10 border-[#D4F684]/40' },
  medium: { label: 'Calibração Média', color: 'text-[#FFB800] bg-[#FFB800]/10 border-[#FFB800]/40' },
  low: { label: 'Calibração Base', color: 'text-[#5CA9E6] bg-[#5CA9E6]/10 border-[#5CA9E6]/40' },
};

function computeAgeFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date();
  let age = today.getFullYear() - year;
  const mDiff = today.getMonth() + 1 - month;
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < day)) {
    age -= 1;
  }
  if (!Number.isFinite(age) || age < 14 || age > 110) return null;
  return age;
}

export const PhysiqueAssessmentModal: React.FC<PhysiqueAssessmentModalProps> = ({
  isOpen,
  onClose,
  onHeightSaved,
  onPlanGenerated,
}) => {
  const { success, error: toastError } = useToast();

  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [biologicalSex, setBiologicalSex] = useState<BiologicalSex | ''>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [age, setAge] = useState<string>('');

  const [missingProfileFields, setMissingProfileFields] = useState<{
    height: boolean;
    sex: boolean;
    ageOrBirthDate: boolean;
  }>({ height: false, sex: false, ageOrBirthDate: false });

  const [goal, setGoal] = useState<PhysiqueAssessmentGoal>('classic_physique');
  const [poses, setPoses] = useState<Partial<Record<BodybuildingPose, EphemeralPoseDraft>>>({});
  const [compressingPose, setCompressingPose] = useState<BodybuildingPose | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [assessment, setAssessment] = useState<PhysiqueAssessmentDTO | null>(null);
  const [history, setHistory] = useState<PhysiqueAssessmentDTO[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<{
    summary: string;
    routines: StrengthRoutineDTO[];
  } | null>(null);
  const [availableStrengthDays, setAvailableStrengthDays] = useState<number>(3);
  const [planMode, setPlanMode] = useState<GeneratePhysiquePlanMode>('create_new');
  const [inlineFeedback, setInlineFeedback] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'form' | 'report'>('form');

  const posesRef = useRef(poses);
  posesRef.current = poses;

  const revokeAllPoseUrls = useCallback(
    (targetPoses?: Partial<Record<BodybuildingPose, EphemeralPoseDraft>>) => {
      const map = targetPoses ?? posesRef.current;
      Object.values(map).forEach((item) => {
        if (item?.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      });
    },
    []
  );

  const clearEphemeralImages = useCallback(() => {
    revokeAllPoseUrls();
    setPoses({});
  }, [revokeAllPoseUrls]);

  useEffect(() => {
    return () => {
      revokeAllPoseUrls();
    };
  }, [revokeAllPoseUrls]);

  useEffect(() => {
    if (!isOpen) {
      clearEphemeralImages();
      setInlineFeedback(null);
      return;
    }

    let active = true;
    setGeneratedPlan(null);
    setInlineFeedback(null);

    Promise.all([
      apiClient<{ profile: UserProfile }>('/api/profile').catch(() => null),
      readinessApi.getOverview().catch(() => null),
      physiqueApi.list().catch(() => [] as PhysiqueAssessmentDTO[]),
    ]).then(([profileRes, readinessRes, listRes]) => {
      if (!active) return;

      const profile = profileRes?.profile;
      const hasHeight = Boolean(profile?.heightCm);
      const hasSex = Boolean(profile?.biologicalSex);
      const computedAge = computeAgeFromBirthDate(profile?.birthDate);

      setMissingProfileFields({
        height: !hasHeight,
        sex: !hasSex,
        ageOrBirthDate: !profile?.birthDate && computedAge === null,
      });

      setHeightCm(profile?.heightCm ? String(profile.heightCm) : '');
      setBiologicalSex(profile?.biologicalSex ?? '');
      setBirthDate(profile?.birthDate ?? '');
      setAge(computedAge !== null ? String(computedAge) : '');

      const prefilledWeight =
        profile?.currentWeightKg ??
        readinessRes?.today?.weightKg ??
        readinessRes?.today?.bodyWeightKg ??
        readinessRes?.history?.[0]?.weightKg ??
        readinessRes?.history?.[0]?.bodyWeightKg;

      if (prefilledWeight) {
        setWeightKg(String(prefilledWeight));
      }

      const items = Array.isArray(listRes) ? listRes : [];
      setHistory(items);
      if (items.length > 0 && !assessment) {
        setAssessment(items[0]);
      }
    });

    return () => {
      active = false;
    };
  }, [isOpen, clearEphemeralImages]);

  if (!isOpen) return null;

  const handleClose = () => {
    clearEphemeralImages();
    onClose();
  };

  const handleSelectPosePhoto = async (poseType: BodybuildingPose, file?: File | null) => {
    if (!file) return;
    setInlineFeedback(null);
    setCompressingPose(poseType);

    let nextPreviewUrl: string | null = null;
    try {
      nextPreviewUrl = URL.createObjectURL(file);
      const compressed = await compressImageToBase64(file, 1024, 0.8);

      setPoses((prev) => {
        const previousUrl = prev[poseType]?.previewUrl;
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return {
          ...prev,
          [poseType]: {
            poseType,
            base64: compressed.base64,
            mimeType: compressed.mimeType,
            previewUrl: nextPreviewUrl!,
          },
        };
      });
    } catch (err: any) {
      if (nextPreviewUrl) {
        URL.revokeObjectURL(nextPreviewUrl);
      }
      toastError(err?.message || 'Erro ao processar imagem selecionada.');
    } finally {
      setCompressingPose(null);
    }
  };

  const handleRemovePosePhoto = (poseType: BodybuildingPose) => {
    setPoses((prev) => {
      const existing = prev[poseType];
      if (existing?.previewUrl) {
        URL.revokeObjectURL(existing.previewUrl);
      }
      const next = { ...prev };
      delete next[poseType];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineFeedback(null);

    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    const parsedAge = birthDate
      ? computeAgeFromBirthDate(birthDate) ?? Number(age)
      : Number(age);

    const selectedPoses = Object.values(poses).filter(Boolean) as EphemeralPoseDraft[];

    if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      toastError('Informe uma altura válida entre 100 e 250 cm.');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      toastError('Informe um peso válido entre 30 e 300 kg.');
      return;
    }
    if (!biologicalSex) {
      toastError('Selecione o sexo biológico para calibração fisiológica.');
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 14 || parsedAge > 110) {
      toastError('Informe uma idade válida (14 a 110 anos) ou data de nascimento.');
      return;
    }
    if (selectedPoses.length === 0) {
      toastError('Envie pelo menos 1 pose de fisiculturismo para avaliação.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Salva automaticamente altura e contexto biológico no perfil caso faltavam
      if (
        missingProfileFields.height ||
        missingProfileFields.sex ||
        missingProfileFields.ageOrBirthDate
      ) {
        const profilePayload: Record<string, any> = {
          heightCm: parsedHeight,
          biologicalSex,
        };
        if (birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
          profilePayload.birthDate = birthDate;
        }
        await apiClient('/api/profile', {
          method: 'PUT',
          body: JSON.stringify(profilePayload),
        }).catch(() => {});
        onHeightSaved?.(parsedHeight);
      }

      const payloadPoses: PhysiquePoseInput[] = selectedPoses.map(
        ({ poseType, base64, mimeType }) => ({
          poseType,
          base64,
          mimeType,
        })
      );

      const created = await physiqueApi.assess({
        poses: payloadPoses,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        biologicalSex,
        age: Math.round(parsedAge),
        ...(birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? { birthDate } : {}),
        goal,
      });

      // Descarte imediato das imagens da memória após envio bem-sucedido
      clearEphemeralImages();
      setAssessment(created);
      setHistory((prev) => [created, ...prev]);
      setViewMode('report');
      success('Avaliação de poses concluída! Imagens descartadas com segurança.');
    } catch (err: any) {
      const msg =
        (err?.details as any)?.message ||
        err?.message ||
        'Não foi possível concluir a avaliação física.';
      if (err?.status === 422) {
        setInlineFeedback(msg);
      }
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!assessment) return;
    setIsGeneratingPlan(true);
    try {
      const res = await physiqueApi.generatePlan(assessment.id, {
        availableStrengthDays,
        mode: planMode,
      });
      setGeneratedPlan(res);
      onPlanGenerated?.(res.routines);
      success(`${res.routines.length} ficha(s) corretiva(s) salva(s) em Musculação!`);
    } catch (err: any) {
      toastError(
        (err?.details as any)?.message || err?.message || 'Erro ao gerar fichas corretivas.'
      );
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const selectedCount = Object.values(poses).filter(Boolean).length;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="physique-modal-title"
      className="fixed inset-0 z-[100] bg-[#05080D]/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full sm:max-w-2xl max-h-[90dvh] bg-[#08090C] border-t sm:border border-[#1F2937] rounded-t-2xl sm:rounded-lg flex flex-col overflow-hidden shadow-2xl">
        {/* Header fixo */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 bg-[#0D1C2D] border-b border-[#1F2937] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shrink-0">
              <ScanLine className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="physique-modal-title"
                className="font-display text-sm sm:text-base font-bold text-[#D4E4FA] uppercase tracking-wide truncate"
              >
                Avaliação Física • 5 Poses IA
              </h2>
              <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider truncate">
                Calibração Dimensional & Plano Corretivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {history.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === 'form' ? 'report' : 'form'))}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#161C24] border border-[#1F2937] hover:border-[#5CA9E6] font-mono text-[10px] uppercase text-[#5CA9E6] transition-colors"
              >
                <History className="h-3 w-3" />
                <span>{viewMode === 'form' ? 'Último Laudo' : 'Nova Análise'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body rolável */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-5">
          {viewMode === 'form' ? (
            <form id="physique-assess-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Protocolo de Poses, Calibração & Privacidade */}
              <div className="p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#5CA9E6]/30 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5CA9E6] font-bold flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Protocolo 5 Poses & Processamento Efêmero
                  </span>
                  <span className="font-mono text-[9px] uppercase px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] text-[#D4F684]">
                    0% armazenamento de fotos
                  </span>
                </div>
                <ul className="flex flex-col gap-1 text-xs text-[#C5C8B4] font-sans">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">01.</span>
                    <span>
                      Envie de <strong>1 a 5 poses</strong> (recomendado enviar as 5 para análise 360° completa).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">02.</span>
                    <span>
                      Mantenha um <strong>objeto de referência</strong> visível ao fundo (porta, interruptor, espelho ou rack) e use <strong>roupa esportiva justa</strong> (bermuda/sunga de pose/top).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">03.</span>
                    <span>
                      As imagens trafegam apenas em memória RAM e são descartadas imediatamente após o laudo (limite: 2 análises válidas / 7 dias).
                    </span>
                  </li>
                </ul>
              </div>

              {inlineFeedback && (
                <div className="p-3.5 rounded-[4px] bg-[#FFB800]/10 border border-[#FFB800]/50 flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 text-[#FFB800] shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#FFB800]">
                      Ajuste necessário antes de avaliar
                    </span>
                    <p className="text-xs text-[#D4E4FA] leading-relaxed">{inlineFeedback}</p>
                  </div>
                </div>
              )}

              {/* Biometria & Contexto Biológico */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 p-3 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
                  <label
                    htmlFor="physique-weight-input"
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <Scale className="h-3 w-3 text-[#5CA9E6]" />
                    Peso Atual (kg)
                  </label>
                  <input
                    id="physique-weight-input"
                    type="number"
                    step="0.1"
                    min={30}
                    max={300}
                    required
                    placeholder="Ex: 82.5"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm font-bold rounded px-2.5 py-2 outline-none"
                  />
                </div>

                <div
                  className={`flex flex-col gap-1.5 p-3 bg-[#161C24] border rounded-[4px] ${
                    missingProfileFields.height ? 'border-[#FFB800]/60' : 'border-[#1F2937]'
                  }`}
                >
                  <label
                    htmlFor="physique-height-input"
                    className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3 text-[#D4F684]" />
                      Altura (cm)
                    </span>
                    {missingProfileFields.height && (
                      <span className="text-[9px] text-[#FFB800]">Salva no perfil</span>
                    )}
                  </label>
                  <input
                    id="physique-height-input"
                    type="number"
                    step="0.5"
                    min={100}
                    max={250}
                    required
                    placeholder="Ex: 178"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm font-bold rounded px-2.5 py-2 outline-none"
                  />
                </div>

                <div
                  className={`flex flex-col gap-1.5 p-3 bg-[#161C24] border rounded-[4px] ${
                    missingProfileFields.sex ? 'border-[#FFB800]/60' : 'border-[#1F2937]'
                  }`}
                >
                  <label
                    htmlFor="physique-sex-select"
                    className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-[#A855F7]" />
                      Sexo Biológico
                    </span>
                    {missingProfileFields.sex && (
                      <span className="text-[9px] text-[#FFB800]">Obrigatório</span>
                    )}
                  </label>
                  <select
                    id="physique-sex-select"
                    required
                    value={biologicalSex}
                    onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex | '')}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-2 outline-none"
                  >
                    <option value="">Selecione…</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>

                <div
                  className={`flex flex-col gap-1.5 p-3 bg-[#161C24] border rounded-[4px] ${
                    missingProfileFields.ageOrBirthDate ? 'border-[#FFB800]/60' : 'border-[#1F2937]'
                  }`}
                >
                  <label
                    htmlFor="physique-age-input"
                    className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-[#5CA9E6]" />
                      Idade (anos)
                    </span>
                    {birthDate && (
                      <span className="text-[9px] text-[#5CA9E6]">Via perfil</span>
                    )}
                  </label>
                  <input
                    id="physique-age-input"
                    type="number"
                    min={14}
                    max={110}
                    required
                    placeholder="Ex: 28"
                    value={age}
                    onChange={(e) => {
                      setAge(e.target.value);
                      setBirthDate('');
                    }}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-sm font-bold rounded px-2.5 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Objetivo / Categoria */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
                  Objetivo / Critério de Avaliação
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGoal(opt.value)}
                      className={`px-3 py-2 rounded-[4px] border font-mono text-[11px] uppercase transition-colors ${
                        goal === opt.value
                          ? 'bg-[#D4F684]/15 border-[#D4F684] text-[#D4F684] font-bold'
                          : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Cards de Poses de Fisiculturismo */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
                    Poses Oficiais de Fisiculturismo (1 a 5 poses)
                  </span>
                  <span className="font-mono text-[10px] text-[#A855F7] font-bold">
                    {selectedCount}/5 enviadas
                  </span>
                </div>

                <div className="flex flex-col gap-2.5">
                  {POSE_META.map(({ poseType, label, contractionTip }, index) => {
                    const photo = poses[poseType];
                    const isCompressing = compressingPose === poseType;
                    const approxKb = photo ? Math.round((photo.base64.length * 3) / 4 / 1024) : 0;

                    return (
                      <div
                        key={poseType}
                        className={`p-3 rounded-[4px] border flex items-start gap-3 transition-colors ${
                          photo
                            ? 'bg-[#D4F684]/5 border-[#D4F684]/50'
                            : 'bg-[#161C24] border-dashed border-[#1F2937]'
                        }`}
                      >
                        {photo?.previewUrl ? (
                          <img
                            src={photo.previewUrl}
                            alt={label}
                            className="w-16 h-20 object-cover rounded border border-[#D4F684]/40 shrink-0 bg-[#0D1C2D]"
                          />
                        ) : (
                          <div className="w-16 h-20 rounded border border-[#1F2937] bg-[#0D1C2D] flex flex-col items-center justify-center shrink-0">
                            <span className="font-mono text-[10px] text-[#8F9380] font-bold">
                              0{index + 1}
                            </span>
                            <Camera className="h-4 w-4 text-[#8F9380] mt-1" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-xs sm:text-sm font-bold uppercase text-[#D4E4FA] truncate">
                              {label}
                            </span>
                            {photo && (
                              <button
                                type="button"
                                onClick={() => handleRemovePosePhoto(poseType)}
                                className="text-[#8F9380] hover:text-[#FFB4AB] p-1"
                                title="Remover foto da pose"
                                aria-label={`Remover ${label}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>

                          <p className="font-sans text-[11px] text-[#C5C8B4] leading-snug">
                            {contractionTip}
                          </p>
                          <p className="font-mono text-[9px] text-[#8F9380]">
                            Fundo c/ referência espacial • traje esportivo justo
                          </p>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            {photo ? (
                              <span className="inline-flex items-center gap-1 text-[#D4F684] font-mono text-[10px]">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                                Pronta ({approxKb} KB)
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] text-[#8F9380]">
                                Opcional (recomendada)
                              </span>
                            )}

                            <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#0D1C2D] border border-[#1F2937] hover:border-[#A855F7] text-[#D4E4FA] font-mono text-[10px] uppercase cursor-pointer transition-colors shrink-0">
                              <Camera className="h-3 w-3 text-[#A855F7]" />
                              <span>
                                {isCompressing
                                  ? 'Comprimindo…'
                                  : photo
                                  ? 'Trocar'
                                  : 'Selecionar'}
                              </span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                disabled={isCompressing || isSubmitting}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  handleSelectPosePhoto(poseType, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </form>
          ) : assessment ? (
            <div className="flex flex-col gap-5">
              {/* Selo de Calibração Espacial */}
              <div className="p-4 rounded-[4px] bg-[#0D1C2D] border border-[#1F2937] flex flex-col gap-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <ScanLine className="h-4 w-4 text-[#5CA9E6]" />
                    <span className="font-mono text-[11px] uppercase tracking-widest text-[#D4E4FA] font-bold">
                      Selo de Calibração Espacial
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded border font-mono text-[10px] uppercase font-bold ${
                      CONFIDENCE_STYLES[assessment.result.spatialCalibration.calibrationConfidence]
                        .color
                    }`}
                  >
                    {
                      CONFIDENCE_STYLES[assessment.result.spatialCalibration.calibrationConfidence]
                        .label
                    }
                  </span>
                </div>

                {assessment.result.spatialCalibration.detectedReferenceObjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {assessment.result.spatialCalibration.detectedReferenceObjects.map((obj, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] font-mono text-[10px] text-[#5CA9E6]"
                      >
                        {obj}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[#C5C8B4] leading-relaxed">
                  {assessment.result.spatialCalibration.perspectiveDistortionNote}
                </p>
              </div>

              {/* Comparativo Evolutivo */}
              {assessment.result.comparisonWithPrevious && (
                <div className="p-3.5 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#A855F7] font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Comparativo Evolutivo ({assessment.result.comparisonWithPrevious.daysSinceLast}d atrás)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] font-mono text-[10px] font-bold text-[#D4F684]">
                      Peso: {assessment.result.comparisonWithPrevious.weightDeltaKg >= 0 ? '+' : ''}
                      {assessment.result.comparisonWithPrevious.weightDeltaKg} kg
                    </span>
                  </div>
                  <p className="text-xs text-[#D4E4FA] leading-relaxed">
                    {assessment.result.comparisonWithPrevious.conditioningEvolutionNote}
                  </p>
                  <p className="text-xs text-[#C5C8B4] leading-relaxed">
                    {assessment.result.comparisonWithPrevious.weakPointsProgress}
                  </p>
                </div>
              )}

              {/* Antropometria & Scores Estéticos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937]">
                  <span className="font-mono text-[9px] uppercase text-[#8F9380] block">IMC</span>
                  <span className="font-display text-lg font-bold text-[#D4E4FA]">
                    {assessment.result.anthropometryEstimate.bmi.toFixed(1)}
                  </span>
                </div>
                <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937]">
                  <span className="font-mono text-[9px] uppercase text-[#8F9380] block">
                    BF% Estimado
                  </span>
                  <span className="font-display text-lg font-bold text-[#D4F684]">
                    {assessment.result.anthropometryEstimate.estimatedBodyFatRange.min}–
                    {assessment.result.anthropometryEstimate.estimatedBodyFatRange.max}%
                  </span>
                </div>
                <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937]">
                  <span className="font-mono text-[9px] uppercase text-[#8F9380] block">
                    V-Taper Visual
                  </span>
                  <span className="font-display text-lg font-bold text-[#5CA9E6]">
                    {assessment.result.anthropometryEstimate.vTaperVisualScore}
                    <span className="text-xs text-[#8F9380]">/100</span>
                  </span>
                </div>
                <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937]">
                  <span className="font-mono text-[9px] uppercase text-[#8F9380] block">
                    Simetria Geral
                  </span>
                  <span className="font-display text-lg font-bold text-[#A855F7]">
                    {assessment.result.anthropometryEstimate.overallSymmetryScore}
                    <span className="text-xs text-[#8F9380]">/100</span>
                  </span>
                </div>
              </div>

              {/* Leitura Geral */}
              <div className="p-3.5 rounded-[4px] bg-[#161C24] border border-[#1F2937]">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380] block mb-1">
                  Leitura Técnica Geral
                </span>
                <p className="text-sm text-[#D4E4FA] leading-relaxed">
                  {assessment.result.physiqueSummary}
                </p>
              </div>

              {/* Pontos Fortes */}
              {assessment.result.strongPoints.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#D4F684] font-bold">
                    Pontos Fortes
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {assessment.result.strongPoints.map((sp, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-[4px] bg-[#D4F684]/5 border border-[#D4F684]/30 flex flex-col gap-1"
                      >
                        <Badge variant="green" size="sm" className="w-fit">
                          {MUSCLE_LABELS[sp.muscleGroup] || sp.muscleGroup}
                        </Badge>
                        <p className="text-xs text-[#C5C8B4]">{sp.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos Fracos com Sub-Região e Poses */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#FF6B35]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF6B35] font-bold">
                    Pontos Fracos Prioritários (Sub-Regiões)
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {assessment.result.weakPoints.map((wp, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#1F2937] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                            {MUSCLE_LABELS[wp.muscleGroup] || wp.muscleGroup}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-[#161C24] border border-[#A855F7]/40 font-mono text-[10px] text-[#D4E4FA]">
                            {wp.subRegion}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold ${
                              wp.priority === 'high'
                                ? 'bg-[#FF6B35]/15 text-[#FF6B35] border border-[#FF6B35]/40'
                                : 'bg-[#FFB800]/15 text-[#FFB800] border border-[#FFB800]/40'
                            }`}
                          >
                            Prioridade {wp.priority === 'high' ? 'Alta' : 'Média'}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-[#A855F7]">
                          Meta: {wp.targetWeeklySets} séries/sem
                        </span>
                      </div>

                      {wp.detectedInPoses && wp.detectedInPoses.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[9px] uppercase text-[#8F9380]">
                            Detectado em:
                          </span>
                          {wp.detectedInPoses.map((poseKey) => (
                            <span
                              key={poseKey}
                              className="px-1.5 py-0.5 rounded bg-[#0B1521] border border-[#1F2937] font-mono text-[9px] text-[#5CA9E6]"
                            >
                              {POSE_LABELS[poseKey] || poseKey}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-[#C5C8B4] leading-relaxed">
                        {wp.technicalReason}
                      </p>

                      <div className="flex flex-wrap gap-1">
                        {wp.recommendedExerciseNames.map((exName, exIdx) => (
                          <span
                            key={exIdx}
                            className="px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] font-mono text-[10px] text-[#D4E4FA]"
                          >
                            {exName}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feedback de Execução & Leitura por Pose */}
              {assessment.result.poseBreakdown && assessment.result.poseBreakdown.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#5CA9E6] font-bold">
                    Análise & Correção de Poses
                  </span>
                  <div className="flex flex-col gap-2">
                    {assessment.result.poseBreakdown.map((pb, idx) => (
                      <div
                        key={`${pb.poseType}-${idx}`}
                        className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-1.5"
                      >
                        <span className="font-display text-xs font-bold uppercase text-[#D4E4FA]">
                          {POSE_LABELS[pb.poseType] || pb.poseType}
                        </span>
                        <p className="text-xs text-[#C5C8B4] leading-relaxed">
                          {pb.muscularAnalysis}
                        </p>
                        <div className="p-2 rounded bg-[#0D1C2D] border border-[#5CA9E6]/30 text-[11px] text-[#D4E4FA] leading-snug">
                          <strong className="font-mono text-[9px] uppercase text-[#5CA9E6] mr-1.5">
                            Dica de Pose:
                          </strong>
                          {pb.posingExecutionTip}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observações Posturais & Divisão Recomendada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {assessment.result.posturalObservations.length > 0 && (
                  <div className="p-3.5 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-1.5">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380] flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-[#FFB800]" />
                      Alinhamento Postural
                    </span>
                    <ul className="flex flex-col gap-1 text-xs text-[#C5C8B4]">
                      {assessment.result.posturalObservations.map((obs, i) => (
                        <li key={i}>• {obs}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-3.5 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380] flex items-center gap-1">
                    <Dumbbell className="h-3 w-3 text-[#A855F7]" />
                    Divisão Semanal Sugerida
                  </span>
                  <p className="text-xs text-[#D4E4FA] leading-relaxed">
                    {assessment.result.recommendedSplit}
                  </p>
                </div>
              </div>

              {/* Configuração do Plano Corretivo */}
              <div className="p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#1F2937] flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
                    Dias de Musculação / Semana
                  </span>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setAvailableStrengthDays(d)}
                        className={`w-7 h-7 rounded font-mono text-xs font-bold border transition-colors ${
                          availableStrengthDays === d
                            ? 'bg-[#D4F684]/15 border-[#D4F684] text-[#D4F684]'
                            : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlanMode('create_new')}
                    className={`px-3 py-2 rounded-[4px] border font-mono text-[10px] uppercase transition-colors ${
                      planMode === 'create_new'
                        ? 'bg-[#A855F7]/15 border-[#A855F7] text-[#D4E4FA] font-bold'
                        : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                    }`}
                  >
                    Criar novas fichas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlanMode('adapt_existing')}
                    className={`px-3 py-2 rounded-[4px] border font-mono text-[10px] uppercase transition-colors ${
                      planMode === 'adapt_existing'
                        ? 'bg-[#A855F7]/15 border-[#A855F7] text-[#D4E4FA] font-bold'
                        : 'bg-[#161C24] border-[#1F2937] text-[#8F9380] hover:text-[#D4E4FA]'
                    }`}
                  >
                    Adaptar fichas atuais
                  </button>
                </div>
              </div>

              {/* Fichas Geradas */}
              {generatedPlan && (
                <div className="p-3.5 rounded-[4px] bg-[#D4F684]/10 border border-[#D4F684]/40 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-mono text-xs text-[#D4F684] font-bold uppercase">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Fichas Corretivas Salvas em Musculação!</span>
                  </div>
                  <p className="text-xs text-[#C5C8B4]">{generatedPlan.summary}</p>
                  <div className="flex flex-col gap-1">
                    {generatedPlan.routines.map((r) => (
                      <div key={r.id} className="font-mono text-[11px] text-[#D4E4FA]">
                        • {r.name} ({r.exercises.length} exercícios)
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer fixo */}
        <div className="px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0B1521] border-t border-[#1F2937] shrink-0 flex flex-col sm:flex-row justify-end gap-2">
          {viewMode === 'form' ? (
            <>
              <Button type="button" variant="secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="physique-assess-form"
                variant="tactile"
                isLoading={isSubmitting}
                disabled={selectedCount === 0 || !!compressingPose}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                {isSubmitting ? 'Calibrando & Analisando…' : `Avaliar ${selectedCount} Pose(s)`}
              </Button>
            </>
          ) : assessment ? (
            <>
              <Button type="button" variant="secondary" onClick={handleClose}>
                Fechar
              </Button>
              <Button
                type="button"
                variant="tactile"
                className="flex-1 sm:flex-none"
                isLoading={isGeneratingPlan}
                onClick={handleGeneratePlan}
                leftIcon={<Dumbbell className="h-4 w-4" />}
              >
                {isGeneratingPlan
                  ? 'Montando Fichas Corretivas…'
                  : 'Gerar Rotina Foco nos Pontos Fracos'}
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
};

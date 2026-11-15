import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  Dumbbell,
  Ruler,
  Scale,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  X,
  AlertTriangle,
  History,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import type {
  BiologicalSex,
  GeneratePhysiquePlanMode,
  MuscleGroup,
  PhysiqueAssessmentDTO,
  PhysiqueAssessmentGoal,
  PhysiqueImageInput,
  PhysiquePhotoAngle,
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

const ANGLE_META: Array<{ angle: PhysiquePhotoAngle; label: string; hint: string }> = [
  { angle: 'front', label: 'Frente', hint: 'Postura natural relaxada' },
  { angle: 'back', label: 'Costas', hint: 'Braços levemente afastados' },
  { angle: 'side', label: 'Perfil', hint: 'Lado direito ou esquerdo' },
];

const GOAL_OPTIONS: Array<{ value: PhysiqueAssessmentGoal; label: string }> = [
  { value: 'hypertrophy', label: 'Hipertrofia' },
  { value: 'definition', label: 'Definição' },
  { value: 'recomposition', label: 'Recomposição' },
  { value: 'athletic', label: 'Atlético' },
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
  const [hasSavedHeight, setHasSavedHeight] = useState<boolean>(true);
  const [goal, setGoal] = useState<PhysiqueAssessmentGoal>('hypertrophy');
  const [photos, setPhotos] = useState<Partial<Record<PhysiquePhotoAngle, PhysiqueImageInput>>>({});
  const [compressingAngle, setCompressingAngle] = useState<PhysiquePhotoAngle | null>(null);
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

  useEffect(() => {
    if (!isOpen) {
      // Garante descarte em memória ao fechar modal
      setPhotos({});
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
      if (profile?.heightCm) {
        setHeightCm(String(profile.heightCm));
        setHasSavedHeight(true);
      } else {
        setHeightCm('');
        setHasSavedHeight(false);
      }

      if (profile?.biologicalSex) {
        setBiologicalSex(profile.biologicalSex);
      }
      if (profile?.birthDate) {
        setBirthDate(profile.birthDate);
      }

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
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPhoto = async (angle: PhysiquePhotoAngle, file?: File | null) => {
    if (!file) return;
    setInlineFeedback(null);
    setCompressingAngle(angle);
    try {
      const compressed = await compressImageToBase64(file, 1024, 0.8);
      setPhotos((prev) => ({
        ...prev,
        [angle]: {
          angle,
          base64: compressed.base64,
          mimeType: compressed.mimeType,
        },
      }));
    } catch (err: any) {
      toastError(err?.message || 'Erro ao processar imagem selecionada.');
    } finally {
      setCompressingAngle(null);
    }
  };

  const handleRemovePhoto = (angle: PhysiquePhotoAngle) => {
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[angle];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInlineFeedback(null);
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    const images = Object.values(photos).filter(Boolean) as PhysiqueImageInput[];

    if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      toastError('Informe uma altura válida entre 100 e 250 cm.');
      return;
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      toastError('Informe um peso válido entre 30 e 300 kg.');
      return;
    }
    if (images.length === 0) {
      toastError('Envie pelo menos 1 foto (Frente, Costas ou Perfil) para avaliação.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Persiste automaticamente a altura no perfil se ainda não estava salva
      if (!hasSavedHeight) {
        await apiClient('/api/profile', {
          method: 'PUT',
          body: JSON.stringify({
            heightCm: parsedHeight,
            ...(biologicalSex ? { biologicalSex } : {}),
            ...(birthDate ? { birthDate } : {}),
          }),
        }).catch(() => {});
        setHasSavedHeight(true);
        onHeightSaved?.(parsedHeight);
      }

      const created = await physiqueApi.assess({
        images,
        heightCm: parsedHeight,
        weightKg: parsedWeight,
        goal,
        ...(biologicalSex ? { biologicalSex } : {}),
        ...(birthDate ? { birthDate } : {}),
      });

      // Descarte imediato do estado das imagens em memória após envio
      setPhotos({});
      setAssessment(created);
      setHistory((prev) => [created, ...prev]);
      setGeneratedPlan(null);
      setViewMode('report');
      success('Avaliação física calibrada com sucesso! Fotos descartadas.');
    } catch (err: any) {
      const msg =
        err?.details?.message ||
        err?.message ||
        'Erro ao gerar avaliação física.';
      setInlineFeedback(msg);
      toastError(msg);
    } finally {
      setPhotos({});
      setIsSubmitting(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!assessment || isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const res = await physiqueApi.generatePlan(assessment.id, {
        availableStrengthDays,
        mode: planMode,
      });
      setGeneratedPlan(res);
      onPlanGenerated?.(res.routines);
      success(`${res.routines.length} ficha(s) corretiva(s) salva(s) em Minhas Fichas!`);
    } catch (err: any) {
      toastError(err?.details?.message || err?.message || 'Erro ao gerar fichas corretivas.');
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const selectedCount = Object.values(photos).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 bg-[#05080D]/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl max-h-[92vh] bg-[#08090C] border border-[#1F2937] rounded-t-2xl sm:rounded-lg flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0D1C2D] border-b border-[#1F2937] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7]">
              <ScanLine className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-display text-sm sm:text-base font-bold text-[#D4E4FA] uppercase tracking-wide">
                Avaliação Física por IA
              </h2>
              <p className="font-mono text-[10px] text-[#8F9380] uppercase tracking-wider">
                Calibração Espacial & Plano Corretivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              onClick={onClose}
              className="p-1.5 rounded text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24] transition-colors"
              aria-label="Fechar modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
          {viewMode === 'form' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              {/* Checklist obrigatório de enquadramento, vestimenta & privacidade */}
              <div className="p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#5CA9E6]/30 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[#5CA9E6] font-bold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Protocolo de Captura & Privacidade</span>
                </div>
                <ul className="flex flex-col gap-1.5 text-xs text-[#C5C8B4] font-sans">
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">01.</span>
                    <span>
                      Deixe um objeto de referência visível ao fundo (porta, interruptor, espelho ou equipamento) para calibração real de escala.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">02.</span>
                    <span>
                      Posicione a câmera na altura do tronco/abdômen, mantendo o celular reto e o ambiente bem iluminado.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">03.</span>
                    <span>
                      Use trajes esportivos justos (shorts/bermuda de treino, top ou sem camisa) para permitir leitura muscular clara e evitar bloqueios nos filtros de segurança da IA.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-[#D4F684] mt-0.5">04.</span>
                    <span>
                      Privacidade total: suas fotos são processadas em memória, descartadas imediatamente e há limite de 2 avaliações válidas a cada 7 dias.
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

              {/* Altura, Peso & Contexto Biológico */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5 p-3 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
                  <label
                    htmlFor="physique-weight-input"
                    className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <span className="flex items-center gap-1">
                      <Scale className="h-3 w-3 text-[#5CA9E6]" />
                      Peso Atual (kg)
                    </span>
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
                    !hasSavedHeight ? 'border-[#FFB800]/60' : 'border-[#1F2937]'
                  }`}
                >
                  <label
                    htmlFor="physique-height-input"
                    className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3 text-[#D4F684]" />
                      Altura (cm) {!hasSavedHeight && <span className="text-[#FFB800]">*</span>}
                    </span>
                    {!hasSavedHeight && (
                      <span className="text-[9px] text-[#FFB800]">Obrigatório</span>
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
                  {!hasSavedHeight && (
                    <span className="font-mono text-[9px] text-[#8F9380]">
                      Será salva automaticamente no seu perfil.
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 p-3 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
                  <label
                    htmlFor="physique-sex-select"
                    className="font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    Sexo Biológico (Ref. BF%)
                  </label>
                  <select
                    id="physique-sex-select"
                    value={biologicalSex}
                    onChange={(e) => setBiologicalSex(e.target.value as BiologicalSex | '')}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-2 outline-none"
                  >
                    <option value="">Não informar</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 p-3 bg-[#161C24] border border-[#1F2937] rounded-[4px]">
                  <label
                    htmlFor="physique-birthdate-input"
                    className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
                  >
                    <Calendar className="h-3 w-3 text-[#5CA9E6]" />
                    Nascimento (Opcional)
                  </label>
                  <input
                    id="physique-birthdate-input"
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2.5 py-2 outline-none"
                  />
                </div>
              </div>

              {/* Objetivo */}
              <div className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
                  Objetivo da Avaliação
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setGoal(opt.value)}
                      className={`px-3 py-2 rounded-[4px] border font-mono text-xs uppercase transition-colors ${
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

              {/* Slots de Foto */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
                    Capturas Corporais (1 a 3 ângulos)
                  </span>
                  <span className="font-mono text-[10px] text-[#A855F7]">
                    {selectedCount}/3 selecionadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {ANGLE_META.map(({ angle, label, hint }) => {
                    const photo = photos[angle];
                    const isCompressing = compressingAngle === angle;
                    const approxKb = photo ? Math.round((photo.base64.length * 3) / 4 / 1024) : 0;

                    return (
                      <div
                        key={angle}
                        className={`p-3 rounded-[4px] border flex flex-col justify-between gap-2 transition-colors ${
                          photo
                            ? 'bg-[#D4F684]/5 border-[#D4F684]/50'
                            : 'bg-[#161C24] border-dashed border-[#1F2937]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display text-xs font-bold uppercase text-[#D4E4FA]">
                            {label}
                          </span>
                          {photo && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(angle)}
                              className="text-[#8F9380] hover:text-[#FFB4AB]"
                              title="Remover foto"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {photo ? (
                          <div className="flex items-center gap-1.5 text-[#D4F684] font-mono text-[10px]">
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Pronta ({approxKb} KB)</span>
                          </div>
                        ) : (
                          <span className="font-mono text-[10px] text-[#8F9380] leading-tight">
                            {hint}
                          </span>
                        )}

                        <label className="mt-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded bg-[#0D1C2D] border border-[#1F2937] hover:border-[#A855F7] text-[#D4E4FA] font-mono text-[10px] uppercase cursor-pointer transition-colors">
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
                              handleSelectPhoto(angle, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2937]">
                <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="tactile"
                  isLoading={isSubmitting}
                  disabled={selectedCount === 0 || !!compressingAngle}
                  leftIcon={<Sparkles className="h-4 w-4" />}
                >
                  {isSubmitting ? 'Calibrando & Analisando…' : 'Executar Avaliação'}
                </Button>
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

              {/* Comparativo Evolutivo (Sem Fotos Armazenadas) */}
              {assessment.result.comparisonWithPrevious && (
                <div className="p-3.5 rounded-[4px] bg-[#A855F7]/10 border border-[#A855F7]/40 flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#A855F7] font-bold flex items-center gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Comparativo Evolutivo ({assessment.result.comparisonWithPrevious.daysSinceLast}d desde o último laudo)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#161C24] border border-[#1F2937] font-mono text-[10px] font-bold text-[#D4F684]">
                      Peso: {assessment.result.comparisonWithPrevious.weightDeltaKg >= 0 ? '+' : ''}
                      {assessment.result.comparisonWithPrevious.weightDeltaKg} kg
                    </span>
                  </div>
                  <p className="text-xs text-[#D4E4FA] leading-relaxed">
                    {assessment.result.comparisonWithPrevious.bodyFatDeltaNote}
                  </p>
                  <p className="text-xs text-[#C5C8B4] leading-relaxed">
                    {assessment.result.comparisonWithPrevious.weakPointsProgress}
                  </p>
                </div>
              )}

              {/* Antropometria Estimada */}
              <div className="grid grid-cols-3 gap-2.5">
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
                    Cintura / Ombros
                  </span>
                  <span className="font-mono text-xs font-bold text-[#5CA9E6] leading-tight block mt-1">
                    {assessment.result.anthropometryEstimate.waistToShoulderVisualRatio}
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

              {/* Pontos Fracos Prioritários */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-[#FF6B35]" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF6B35] font-bold">
                    Pontos Fracos Prioritários
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {assessment.result.weakPoints.map((wp, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-[4px] bg-[#0D1C2D] border border-[#1F2937] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
                            {MUSCLE_LABELS[wp.muscleGroup] || wp.muscleGroup}
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

              {/* Configuração do Plano Corretivo (Dias & Modo) */}
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

              {/* Ações do Laudo */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#1F2937]">
                <Button
                  type="button"
                  variant="tactile"
                  className="flex-1"
                  isLoading={isGeneratingPlan}
                  onClick={handleGeneratePlan}
                  leftIcon={<Dumbbell className="h-4 w-4" />}
                >
                  {isGeneratingPlan
                    ? 'Montando Fichas Corretivas…'
                    : 'Gerar Rotina Foco nos Pontos Fracos'}
                </Button>
                <Button type="button" variant="secondary" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../contexts/AuthContext';
import {
  User,
  Settings,
  LogOut,
  Download,
  Sliders,
  Ruler,
  Bell,
  ChevronRight,
  ScanLine,
  Pencil,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';
import { useToast } from '../../contexts/ToastContext';
import type { UserProfile } from '../../types/user.types';
import { PhysiqueAssessmentModal } from '../../features/physique/components/PhysiqueAssessmentModal';

export const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [biologicalSex, setBiologicalSex] = useState<'male' | 'female' | ''>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [isEditingHeight, setIsEditingHeight] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [isSavingHeight, setIsSavingHeight] = useState(false);
  const [isEditingBioContext, setIsEditingBioContext] = useState(false);
  const [bioSexInput, setBioSexInput] = useState<'male' | 'female' | ''>('');
  const [birthDateInput, setBirthDateInput] = useState('');
  const [isSavingBioContext, setIsSavingBioContext] = useState(false);
  const [showPhysiqueModal, setShowPhysiqueModal] = useState(false);

  useEffect(() => {
    apiClient<{ profile: UserProfile }>('/api/profile')
      .then((payload) => {
        setWeightKg(payload.profile?.currentWeightKg ?? null);
        setHeightCm(payload.profile?.heightCm ?? null);
        setBiologicalSex(payload.profile?.biologicalSex ?? '');
        setBirthDate(payload.profile?.birthDate ?? '');
      })
      .catch(() => {
        setWeightKg(null);
        setHeightCm(null);
        setBiologicalSex('');
        setBirthDate('');
      });
  }, []);

  const handleSaveHeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(heightInput);
    if (!Number.isFinite(val) || val < 100 || val > 250) {
      toastError('Informe uma altura válida entre 100 e 250 cm.');
      return;
    }
    setIsSavingHeight(true);
    try {
      const res = await apiClient<{ profile: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify({ heightCm: val }),
      });
      setHeightCm(res.profile?.heightCm ?? val);
      setIsEditingHeight(false);
      success('Altura atualizada com sucesso.');
    } catch (err: any) {
      toastError(err?.message || 'Erro ao atualizar altura.');
    } finally {
      setIsSavingHeight(false);
    }
  };

  const handleSaveBioContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (birthDateInput && !/^\d{4}-\d{2}-\d{2}$/.test(birthDateInput)) {
      toastError('Informe a data de nascimento no formato válido.');
      return;
    }
    const payload: Record<string, any> = {};
    if (bioSexInput) payload.biologicalSex = bioSexInput;
    if (birthDateInput) payload.birthDate = birthDateInput;

    if (Object.keys(payload).length === 0) {
      setIsEditingBioContext(false);
      return;
    }

    setIsSavingBioContext(true);
    try {
      const res = await apiClient<{ profile: UserProfile }>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setBiologicalSex(res.profile?.biologicalSex ?? bioSexInput);
      setBirthDate(res.profile?.birthDate ?? birthDateInput);
      setIsEditingBioContext(false);
      success('Dados fisiológicos atualizados com sucesso.');
    } catch (err: any) {
      toastError(err?.message || 'Erro ao atualizar dados fisiológicos.');
    } finally {
      setIsSavingBioContext(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-24">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Perfil do Atleta
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1">
            Informações do perfil e atalhos rápidos de configurações
          </p>
        </div>

        <Link
          to="/settings"
          className="flex items-center gap-1.5 py-2 px-3 bg-[#161C24] hover:bg-[#1F2937] border border-[#1F2937] text-[#D4F684] font-mono text-xs uppercase font-bold tracking-wider rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Configurações
        </Link>
      </div>

      <Card variant="watch" className="p-6 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-[#161C24] border-2 border-[#1F2937] flex items-center justify-center shrink-0">
            <User className="h-8 w-8 text-[#5CA9E6]" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="font-display text-xl font-bold text-[#D4E4FA] uppercase truncate">
              {user?.name}
            </span>
            <span className="font-mono text-xs text-[#8F9380] truncate">{user?.email}</span>
            <span className="font-mono text-[10px] bg-[#161C24] text-[#D4F684] px-2 py-0.5 rounded-[2px] w-fit mt-2 border border-[#1F2937]">
              PACELOG PRO
            </span>
          </div>
        </div>

        {/* Biometria: Peso e Altura editável */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#1F2937]">
          <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8F9380]">
              Peso Atual
            </span>
            <span className="font-display text-base font-bold text-[#5CA9E6] mt-0.5">
              {weightKg !== null ? `${weightKg.toFixed(1)} kg` : '—'}
            </span>
          </div>

          <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col">
            <div className="flex items-center justify-between">
              <label
                htmlFor="profile-height-input"
                className="font-mono text-[10px] uppercase tracking-wider text-[#8F9380]"
              >
                Altura (cm)
              </label>
              {!isEditingHeight && (
                <button
                  type="button"
                  onClick={() => {
                    setHeightInput(heightCm ? String(heightCm) : '');
                    setIsEditingHeight(true);
                  }}
                  className="text-[#8F9380] hover:text-[#D4F684] transition-colors"
                  title="Editar altura"
                  aria-label="Editar altura em cm"
                >
                  <Pencil className="h-3 w-3" />
                </button>
              )}
            </div>

            {!isEditingHeight ? (
              <span className="font-display text-base font-bold text-[#D4F684] mt-0.5">
                {heightCm !== null ? `${heightCm} cm` : 'Não informada'}
              </span>
            ) : (
              <form onSubmit={handleSaveHeight} className="flex items-center gap-1.5 mt-1">
                <input
                  id="profile-height-input"
                  type="number"
                  step="0.5"
                  min={100}
                  max={250}
                  placeholder="178"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="w-20 bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2 py-1 outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSavingHeight}
                  className="p-1 bg-[#D4F684] text-[#0A0D14] rounded hover:bg-[#bce65c] disabled:opacity-50"
                  title="Salvar altura"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Contexto Biológico (Sexo & Nascimento) */}
        <div className="p-3 rounded-[4px] bg-[#161C24] border border-[#1F2937] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#8F9380]">
              Referência Fisiológica (BF% & Simetria)
            </span>
            {!isEditingBioContext && (
              <button
                type="button"
                onClick={() => {
                  setBioSexInput(biologicalSex);
                  setBirthDateInput(birthDate);
                  setIsEditingBioContext(true);
                }}
                className="text-[#8F9380] hover:text-[#D4F684] transition-colors flex items-center gap-1 font-mono text-[10px]"
                aria-label="Editar referência fisiológica"
              >
                <Pencil className="h-3 w-3" />
                <span>Editar</span>
              </button>
            )}
          </div>

          {!isEditingBioContext ? (
            <div className="flex items-center justify-between text-xs font-mono text-[#D4E4FA]">
              <span>
                Sexo:{' '}
                {biologicalSex === 'male'
                  ? 'Masculino'
                  : biologicalSex === 'female'
                    ? 'Feminino'
                    : 'Não informado'}
              </span>
              <span>
                Nascimento: {birthDate ? birthDate.split('-').reverse().join('/') : 'Não informado'}
              </span>
            </div>
          ) : (
            <form onSubmit={handleSaveBioContext} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase text-[#8F9380]">
                  Sexo Biológico
                </label>
                <select
                  value={bioSexInput}
                  onChange={(e) => setBioSexInput(e.target.value as 'male' | 'female' | '')}
                  className="bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2 py-1.5 outline-none"
                >
                  <option value="">Não informar</option>
                  <option value="male">Masculino</option>
                  <option value="female">Feminino</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-mono text-[9px] uppercase text-[#8F9380]">
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  value={birthDateInput}
                  onChange={(e) => setBirthDateInput(e.target.value)}
                  className="bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded px-2 py-1.5 outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={isSavingBioContext}
                  className="flex-1 py-1.5 px-3 bg-[#D4F684] text-[#0A0D14] font-mono text-[10px] font-bold uppercase rounded hover:bg-[#bce65c] disabled:opacity-50"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBioContext(false)}
                  className="py-1.5 px-2.5 bg-[#0D1C2D] border border-[#1F2937] text-[#8F9380] font-mono text-[10px] uppercase rounded hover:text-[#D4E4FA]"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </Card>

      {/* Atalho Avaliação Física por IA */}
      <button
        type="button"
        onClick={() => setShowPhysiqueModal(true)}
        className="w-full p-4 rounded-[4px] bg-[#0D1C2D] border border-[#A855F7]/40 hover:border-[#A855F7] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[4px] bg-[#A855F7]/15 border border-[#A855F7]/40 flex items-center justify-center text-[#A855F7] shrink-0">
            <ScanLine className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-display text-sm font-bold text-[#D4E4FA] uppercase">
              Avaliação Física por IA
            </span>
            <span className="font-mono text-[10px] text-[#8F9380]">
              Calibração dimensional efêmera & plano para pontos fracos
            </span>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-[#A855F7] shrink-0" />
      </button>

      <div className="grid grid-cols-1 gap-4">
        <h2 className="font-mono text-[10px] text-[#C5C8B4] uppercase tracking-widest mt-2">
          Central de Preferências & Ajustes
        </h2>

        <Card className="flex flex-col border-[#1F2937] divide-y divide-[#1F2937]">
          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Ruler className="h-4 w-4 text-[#38BDF8]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Unidades e Fuso Horário</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Km/Milhas, Kg/Libras, formato 24h
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4 text-[#D4F684]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Esportes & Métricas</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Modalidades ativas e personalização de campos
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-[#FFB800]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Lembretes de Treino</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Programação semanal e notificações
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>

          <Link
            to="/settings"
            className="p-4 flex items-center justify-between hover:bg-[#161C24] cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="h-4 w-4 text-[#10B981]" />
              <div className="flex flex-col">
                <span className="font-sans text-sm text-[#D4E4FA]">Backup e Exportação</span>
                <span className="font-mono text-[10px] text-[#8F9380]">
                  Download de planilhas CSV, JSON e restauração
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#8F9380]" />
          </Link>
        </Card>
      </div>

      <div className="mt-6">
        <Button
          variant="secondary"
          className="w-full text-[#FFB4AB] border-[#FFB4AB]/20 hover:bg-[#FFB4AB]/10 hover:border-[#FFB4AB]"
          leftIcon={<LogOut className="h-4 w-4" />}
          onClick={signOut}
        >
          ENCERRAR SESSÃO
        </Button>
      </div>

      <PhysiqueAssessmentModal
        isOpen={showPhysiqueModal}
        onClose={() => setShowPhysiqueModal(false)}
        onHeightSaved={(val) => setHeightCm(val)}
        onPlanGenerated={() => {
          setShowPhysiqueModal(false);
          navigate('/strength');
        }}
      />
    </div>
  );
};

export default ProfilePage;

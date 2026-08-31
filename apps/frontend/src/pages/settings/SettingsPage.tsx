import React, { useState } from 'react';
import { UnitSettingsSection } from '../../components/settings/UnitSettingsSection';
import { AppearanceSettingsSection } from '../../components/settings/AppearanceSettingsSection';
import { GoalsConsistencySection } from '../../components/settings/GoalsConsistencySection';
import { NotificationSettingsSection } from '../../components/settings/NotificationSettingsSection';
import { SportsConfigSection } from '../../components/settings/SportsConfigSection';
import { AccountSettingsSection } from '../../components/settings/AccountSettingsSection';
import { DataPrivacySection } from '../../components/settings/DataPrivacySection';
import { PwaUpdateSection } from '../../components/settings/PwaUpdateSection';
import {
  Ruler,
  Palette,
  Target,
  Bell,
  Activity,
  User,
  ShieldCheck,
  Smartphone,
  ChevronRight,
} from 'lucide-react';

type SettingsTab =
  | 'units'
  | 'appearance'
  | 'goals'
  | 'notifications'
  | 'sports'
  | 'account'
  | 'privacy'
  | 'pwa';

const TABS: { id: SettingsTab; label: string; shortLabel: string; icon: any; category: string }[] = [
  { id: 'units', label: 'Unidades e Fuso', shortLabel: 'Unidades', icon: Ruler, category: 'Telemetria' },
  { id: 'appearance', label: 'Aparência e Idioma', shortLabel: 'Aparência', icon: Palette, category: 'Interface' },
  { id: 'goals', label: 'Metas e Consistência', shortLabel: 'Metas', icon: Target, category: 'Treino' },
  { id: 'notifications', label: 'Notificações e Lembretes', shortLabel: 'Notificações', icon: Bell, category: 'Treino' },
  { id: 'sports', label: 'Esportes e Métricas', shortLabel: 'Esportes', icon: Activity, category: 'Treino' },
  { id: 'account', label: 'Conta e Segurança', shortLabel: 'Conta', icon: User, category: 'Geral' },
  { id: 'privacy', label: 'Dados e Backup', shortLabel: 'Backup', icon: ShieldCheck, category: 'Geral' },
  { id: 'pwa', label: 'Aplicativo (PWA)', shortLabel: 'App PWA', icon: Smartphone, category: 'Geral' },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('units');

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto pb-16">
      {/* Header da Página */}
      <div className="flex flex-col gap-1 border-b border-[#1F2937] pb-4">
        <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
          Configurações e Preferências
        </h1>
        <p className="font-mono text-xs text-[#8F9380]">
          Centralize suas regras de treino, conversões de unidade, dados e segurança da conta.
        </p>
      </div>

      {/* Navegação Mobile: Barra de Abas Horizontal Rolável */}
      <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl whitespace-nowrap text-xs font-mono font-bold uppercase tracking-wider transition-all flex-shrink-0 border ${
                isActive
                  ? 'bg-[#161C24] text-[#D4F684] border-[#D4F684]/50 shadow-[0_0_15px_rgba(212,246,132,0.15)]'
                  : 'bg-[#0D1C2D] text-[#8F9380] border-[#1F2937] hover:text-[#D4E4FA]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#D4F684]' : 'text-[#8F9380]'}`} />
              <span>{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Layout Grid no Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Menu Lateral de Navegação (Apenas Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-1.5 bg-[#0D1C2D] border border-[#1F2937] p-2 rounded-xl lg:sticky lg:top-4">
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-[#8F9380]">
            Módulos do Sistema
          </div>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-between p-3 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-[#161C24] text-[#D4F684] border border-[#1F2937] shadow-sm'
                    : 'text-[#8F9380] hover:text-[#D4E4FA] hover:bg-[#161C24]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-[#D4F684]/15 text-[#D4F684]' : 'bg-[#051424] text-[#8F9380]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-display text-xs font-bold uppercase tracking-wider">
                      {tab.label}
                    </span>
                    <span className="font-mono text-[9px] text-[#8F9380]">
                      {tab.category}
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#D4F684]' : 'text-[#8F9380]/40'}`} />
              </button>
            );
          })}
        </div>

        {/* Conteúdo da Seção Ativa */}
        <div className="lg:col-span-8 bg-[#0D1C2D]/60 border border-[#1F2937] p-4 sm:p-6 rounded-2xl">
          {activeTab === 'units' && <UnitSettingsSection />}
          {activeTab === 'appearance' && <AppearanceSettingsSection />}
          {activeTab === 'goals' && <GoalsConsistencySection />}
          {activeTab === 'notifications' && <NotificationSettingsSection />}
          {activeTab === 'sports' && <SportsConfigSection />}
          {activeTab === 'account' && <AccountSettingsSection />}
          {activeTab === 'privacy' && <DataPrivacySection />}
          {activeTab === 'pwa' && <PwaUpdateSection />}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;

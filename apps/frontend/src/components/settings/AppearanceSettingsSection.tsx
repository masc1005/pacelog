import React from 'react';
import { Card } from '../ui/Card';
import { useSettings } from '../../hooks/useSettings';
import { Moon, Sun, Monitor, Languages, Calendar } from 'lucide-react';
import type { Theme, Language, WeekStart } from '@pacelog/shared';

export const AppearanceSettingsSection: React.FC = () => {
  const { settings, updateSettings } = useSettings();

  if (!settings) return null;

  const themes: { id: Theme; label: string; desc: string; icon: any }[] = [
    { id: 'dark', label: 'Tactical Dark', desc: 'Fundo escuro profundo com acentos neon e alto contraste', icon: Moon },
    { id: 'light', label: 'Clean Light', desc: 'Interface clara com máxima legibilidade para ambientes ensolarados', icon: Sun },
    { id: 'system', label: 'Seguir Sistema', desc: 'Alterna automaticamente conforme as configurações do seu dispositivo', icon: Monitor },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-bold text-[#D4E4FA] uppercase tracking-wide">
          Aparência e Idioma
        </h2>
        <p className="font-mono text-xs text-[#8F9380] mt-0.5">
          Personalize o visual, o idioma e a estrutura de calendário do PACELOG.
        </p>
      </div>

      {/* Tema da Aplicação */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest">
          Tema Visual
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {themes.map((t) => {
            const Icon = t.icon;
            const isSelected = settings.theme === t.id;
            return (
              <Card
                key={t.id}
                onClick={() => updateSettings({ theme: t.id })}
                className={`p-4 flex flex-col gap-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#161C24] border-[#D4F684] shadow-[0_0_20px_rgba(212,246,132,0.15)]'
                    : 'bg-[#0D1C2D] border-[#1F2937] hover:border-[#454839]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#051424] border border-[#1F2937] flex items-center justify-center">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-[#D4F684]' : 'text-[#8F9380]'}`} />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#D4F684] animate-pulse" />
                  )}
                </div>
                <span className="font-display text-sm font-bold text-[#D4E4FA] mt-1">
                  {t.label}
                </span>
                <p className="text-[11px] text-[#8F9380] leading-tight">
                  {t.desc}
                </p>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Idioma */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Languages className="w-4 h-4 text-[#5CA9E6]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Idioma
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Labels, métricas e análises com IA.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(['pt-BR', 'en-US'] as Language[]).map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => updateSettings({ language: lang })}
                className={`py-2.5 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.language === lang
                    ? 'bg-[#5CA9E6] text-[#051424] shadow-[0_0_15px_rgba(92,169,230,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {lang === 'pt-BR' ? 'Português (BR)' : 'English (US)'}
              </button>
            ))}
          </div>
        </Card>

        {/* Primeiro Dia da Semana */}
        <Card className="p-5 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[#D4E4FA]">
            <Calendar className="w-4 h-4 text-[#FFB800]" />
            <span className="font-mono text-xs uppercase font-bold tracking-wider">
              Início da Semana
            </span>
          </div>
          <p className="text-xs text-[#8F9380]">Afeta agrupamentos do dashboard e metas semanais.</p>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {(['monday', 'sunday'] as WeekStart[]).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => updateSettings({ weekStart: day })}
                className={`py-2.5 px-3 rounded text-xs font-mono font-bold uppercase transition-all ${
                  settings.weekStart === day
                    ? 'bg-[#FFB800] text-[#051424] shadow-[0_0_15px_rgba(255,184,0,0.3)]'
                    : 'bg-[#161C24] text-[#8F9380] border border-[#1F2937] hover:text-[#D4E4FA]'
                }`}
              >
                {day === 'monday' ? 'Segunda-feira' : 'Domingo'}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

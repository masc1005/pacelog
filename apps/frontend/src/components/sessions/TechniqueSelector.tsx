import React, { useState } from 'react';
import { Plus, X, BookOpen } from 'lucide-react';

export const SPORT_TECHNIQUE_PRESETS: Record<string, string[]> = {
  jiujitsu: [
    'Passagem Toreando',
    'Guarda De La Riva',
    'Meia-Guarda',
    'Guarda Fechada',
    'Guarda Aranha / Laço',
    'Raspagem de Gancho',
    'Passagem Emborcada',
    'Armlock',
    'Triângulo',
    'Kimura / Americana',
    'Mata-Leão / Costas',
    'Estrangulamento Cruzado',
    'Guilhotina',
    'Queda (Double/Single Leg)',
    'Defesa de Passagem',
  ],
  boxing: [
    'Jab-Direto (1-2)',
    'Jab-Direto-Cruzado (1-2-3)',
    'Pêndulo e Esquiva',
    'Footwork / Movimentação',
    'Contra-golpe (Counter)',
    'Uppercut e Curta Distância',
    'Golpes na Linha de Cintura',
    'Bloqueio e Guarda Alta',
    'Saída Lateral / Pivô',
    'Combinação no Saco',
    'Manopla de Velocidade',
    'Controle de Distância',
  ],
  futevolei: [
    'Recepção de Peito',
    'Levantada de Peito',
    'Levantada de Cabeça',
    'Shark Attack',
    'Pingifongo (Curta)',
    'Ataque de Cabeça',
    'Diagonal Curta',
    'Paralela',
    'Saque com Efeito',
    'Defesa / Cobertura de Quadra',
    'Chapa / Colocada',
    'Ombro',
  ],
};

interface TechniqueSelectorProps {
  sportKey: 'jiujitsu' | 'boxing' | 'futevolei';
  selected: string[];
  onChange: (techniques: string[]) => void;
  accentColor?: string;
}

export const TechniqueSelector: React.FC<TechniqueSelectorProps> = ({
  sportKey,
  selected = [],
  onChange,
  accentColor = '#D4F684',
}) => {
  const [customInput, setCustomInput] = useState('');
  const presets = SPORT_TECHNIQUE_PRESETS[sportKey] || [];

  const normalizedSelected = Array.isArray(selected) ? selected : [];

  const handleToggle = (tech: string) => {
    const exists = normalizedSelected.some(
      (item) => item.toLowerCase() === tech.toLowerCase()
    );
    if (exists) {
      onChange(
        normalizedSelected.filter(
          (item) => item.toLowerCase() !== tech.toLowerCase()
        )
      );
    } else {
      onChange([...normalizedSelected, tech]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;

    // Suporta adicionar múltiplos separados por vírgula
    const parts = trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const next = [...normalizedSelected];
    for (const part of parts) {
      const exists = next.some((item) => item.toLowerCase() === part.toLowerCase());
      if (!exists) {
        next.push(part);
      }
    }

    onChange(next);
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    }
  };

  // Técnicas customizadas que não estão nos presets padrão
  const customSelected = normalizedSelected.filter(
    (item) => !presets.some((p) => p.toLowerCase() === item.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3 p-4 bg-[#161C24] border border-[#1F2937] rounded-[4px] col-span-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#C5C8B4] font-bold">
            Diário Técnico • Fundamentos Praticados
          </span>
        </div>
        {normalizedSelected.length > 0 && (
          <span
            className="font-mono text-[10px] px-2 py-0.5 rounded-full border font-bold"
            style={{
              color: accentColor,
              borderColor: `${accentColor}40`,
              backgroundColor: `${accentColor}15`,
            }}
          >
            {normalizedSelected.length} selecionado{normalizedSelected.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Chips de Presets da Modalidade */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((tech) => {
          const isSelected = normalizedSelected.some(
            (item) => item.toLowerCase() === tech.toLowerCase()
          );
          return (
            <button
              key={tech}
              type="button"
              onClick={() => handleToggle(tech)}
              className={`px-2.5 py-1 rounded-[3px] font-mono text-[11px] border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'text-[#051424] font-bold shadow-sm'
                  : 'bg-[#0D1C2D] text-[#C5C8B4] border-[#1F2937] hover:border-[#454839] hover:text-[#D4E4FA]'
              }`}
              style={
                isSelected
                  ? {
                      backgroundColor: accentColor,
                      borderColor: accentColor,
                    }
                  : undefined
              }
            >
              {tech}
            </button>
          );
        })}
      </div>

      {/* Chips customizados adicionados pelo atleta */}
      {customSelected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[#1F2937]/60">
          {customSelected.map((tech) => (
            <span
              key={tech}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] font-mono text-[11px] font-bold text-[#051424]"
              style={{ backgroundColor: accentColor }}
            >
              <span>{tech}</span>
              <button
                type="button"
                onClick={() => handleToggle(tech)}
                className="hover:opacity-75"
                aria-label={`Remover fundamento ${tech}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input para adicionar técnica/fundamento customizado */}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar fundamento específico (ex: Berimbolo, Esquiva Lateral)..."
          className="flex-1 bg-[#0D1C2D] border border-[#1F2937] focus:border-[#D4F684] text-[#D4E4FA] font-mono text-xs rounded-[3px] px-3 py-2 outline-none"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          disabled={!customInput.trim()}
          className="inline-flex items-center gap-1 px-3 py-2 bg-[#0D1C2D] border border-[#1F2937] hover:border-[#D4F684] text-[#D4E4FA] disabled:opacity-40 font-mono text-xs uppercase font-bold rounded-[3px] transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Adicionar</span>
        </button>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  type Gear,
  type GearCategory,
  type GearComponentInput,
  GEAR_CATEGORIES,
  GEAR_CATEGORY_META,
  GEAR_USAGE_UNIT_LABEL,
} from '@pacelog/shared';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { GEAR_VISUAL_META } from './gearMeta';
import { Plus, Trash2, Wrench } from 'lucide-react';

interface GearFormProps {
  initialData?: Gear;
  initialCategory?: GearCategory;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const GearForm: React.FC<GearFormProps> = ({
  initialData,
  initialCategory,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [category, setCategory] = useState<GearCategory>(
    initialData?.category || initialCategory || 'running_shoe'
  );
  const [model, setModel] = useState(initialData?.model || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate
      ? new Date(initialData.purchaseDate).toISOString().slice(0, 10)
      : ''
  );
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const meta = GEAR_CATEGORY_META[category];
  const unit = meta.usageUnit;
  const unitLabel = GEAR_USAGE_UNIT_LABEL[unit]?.short ?? unit;

  // Limites por unidade
  const [distanceLimitKm, setDistanceLimitKm] = useState<number | ''>(
    initialData?.distanceLimitKm ?? (unit === 'km' && meta.defaultLimit ? meta.defaultLimit : '')
  );
  const [roundsLimit, setRoundsLimit] = useState<number | ''>(
    initialData?.roundsLimit ?? (unit === 'rounds' && meta.defaultLimit ? meta.defaultLimit : '')
  );
  const [sessionsLimit, setSessionsLimit] = useState<number | ''>(
    initialData?.sessionsLimit ?? (unit === 'sessions' && meta.defaultLimit ? meta.defaultLimit : '')
  );

  // Uso inicial (apenas na criação)
  const [initialDistanceKm, setInitialDistanceKm] = useState<number>(
    initialData?.initialDistanceKm || 0
  );
  const [initialRounds, setInitialRounds] = useState<number>(
    0
  );
  const [initialSessions, setInitialSessions] = useState<number>(
    0
  );

  // Componentes para Bike (na criação)
  const [components, setComponents] = useState<GearComponentInput[]>(() => {
    if (initialData || category !== 'bike') return [];
    return [
      { name: 'Corrente', distanceLimitKm: 3000, alreadyUsedKm: 0 },
      { name: 'Pneu Dianteiro', distanceLimitKm: 5000, alreadyUsedKm: 0 },
      { name: 'Pneu Traseiro', distanceLimitKm: 5000, alreadyUsedKm: 0 },
    ];
  });

  const handleCategoryChange = (newCat: GearCategory) => {
    setCategory(newCat);
    const newMeta = GEAR_CATEGORY_META[newCat];
    if (newCat === 'bike' && !initialData && components.length === 0) {
      setComponents([
        { name: 'Corrente', distanceLimitKm: 3000, alreadyUsedKm: 0 },
        { name: 'Pneu Dianteiro', distanceLimitKm: 5000, alreadyUsedKm: 0 },
        { name: 'Pneu Traseiro', distanceLimitKm: 5000, alreadyUsedKm: 0 },
      ]);
    }
    if (newMeta.usageUnit === 'km') {
      setDistanceLimitKm(newMeta.defaultLimit ?? '');
    } else if (newMeta.usageUnit === 'rounds') {
      setRoundsLimit(newMeta.defaultLimit ?? '');
    } else if (newMeta.usageUnit === 'sessions') {
      setSessionsLimit(newMeta.defaultLimit ?? '');
    }
  };

  const handleAddComponent = () => {
    setComponents((prev) => [...prev, { name: '', distanceLimitKm: 3000, alreadyUsedKm: 0 }]);
  };

  const handleRemoveComponent = (idx: number) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateComponent = (idx: number, patch: Partial<GearComponentInput>) => {
    setComponents((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: Record<string, any> = {
      model,
      brand: brand || undefined,
      nickname: nickname || undefined,
      purchaseDate: purchaseDate || undefined,
      isDefault,
    };

    if (!initialData) {
      payload.category = category;
      if (unit === 'km') payload.initialDistanceKm = initialDistanceKm;
      if (unit === 'rounds') payload.initialRounds = initialRounds;
      if (unit === 'sessions') payload.initialSessions = initialSessions;

      if (category === 'bike' && components.length > 0) {
        payload.components = components.filter((c) => c.name.trim().length > 0);
      }
    }

    if (unit === 'km') {
      payload.distanceLimitKm = distanceLimitKm === '' ? undefined : Number(distanceLimitKm);
    } else if (unit === 'rounds') {
      payload.roundsLimit = roundsLimit === '' ? undefined : Number(roundsLimit);
    } else if (unit === 'sessions') {
      payload.sessionsLimit = sessionsLimit === '' ? undefined : Number(sessionsLimit);
    }

    await onSubmit(payload);
  };

  return (
    <Card className="p-6 bg-[#0D1C2D] border-[#1F2937]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Seleção de Categoria (apenas na criação) */}
        {!initialData && (
          <div>
            <label className="block font-mono text-[11px] text-[#8F9380] uppercase tracking-wider mb-2">
              Tipo de Equipamento *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {GEAR_CATEGORIES.map((cat) => {
                const cMeta = GEAR_VISUAL_META[cat];
                const Icon = cMeta.icon;
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded border text-center transition-all ${
                      isSelected
                        ? 'border-[#D4F684] bg-[#D4F684]/10 text-[#D4F684]'
                        : 'border-[#1F2937] bg-[#161C24] text-[#8F9380] hover:border-[#454839]'
                    }`}
                  >
                    <Icon className="w-5 h-5" style={{ color: isSelected ? '#D4F684' : cMeta.color }} />
                    <span className="font-mono text-[11px] font-bold">{cMeta.singular}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Marca"
            placeholder={
              category === 'bike'
                ? 'Ex: Specialized, Trek, Caloi'
                : category === 'boxing_gloves'
                ? 'Ex: Venum, Fairtex, Everlast'
                : category === 'jiujitsu_gi' || category === 'rashguard'
                ? 'Ex: Koral, Atama, Keiko, Venum'
                : 'Ex: Nike, Adidas, Asics'
            }
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
          <Input
            label="Modelo / Nome *"
            placeholder={
              category === 'bike'
                ? 'Ex: Allez Sprint, Speedster'
                : category === 'boxing_gloves'
                ? 'Ex: Pro Boxing 14oz, Challenger 3.0'
                : category === 'jiujitsu_gi'
                ? 'Ex: Classic A2 Azul'
                : category === 'rashguard'
                ? 'Ex: Manga Longa Preto'
                : 'Ex: Pegasus 41, Nimbus 26'
            }
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
          />
        </div>

        <Input
          label="Apelido (Opcional)"
          placeholder="Ex: Luva de Sparring, Bike de Estrada, Kimono de Competição"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />

        {/* Uso inicial e Limites de acordo com a unidade */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!initialData && (
            <>
              {unit === 'km' && (
                <Input
                  label="Quilometragem Inicial (km)"
                  type="number"
                  step="0.1"
                  min="0"
                  value={initialDistanceKm}
                  onChange={(e) => setInitialDistanceKm(Number(e.target.value))}
                />
              )}
              {unit === 'rounds' && (
                <Input
                  label="Rounds Iniciais Já Realizados"
                  type="number"
                  min="0"
                  value={initialRounds}
                  onChange={(e) => setInitialRounds(Number(e.target.value))}
                />
              )}
              {unit === 'sessions' && (
                <Input
                  label="Treinos Iniciais Já Realizados"
                  type="number"
                  min="0"
                  value={initialSessions}
                  onChange={(e) => setInitialSessions(Number(e.target.value))}
                />
              )}
            </>
          )}

          {unit === 'km' && (
            <Input
              label={
                category === 'bike'
                  ? 'Limite Geral da Bike (km, opcional)'
                  : `Vida Útil Esperada (${unitLabel})`
              }
              type="number"
              min="0"
              placeholder={category === 'bike' ? 'Ilimitado por padrão' : 'Ex: 800'}
              value={distanceLimitKm}
              onChange={(e) =>
                setDistanceLimitKm(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          )}

          {unit === 'rounds' && (
            <Input
              label={`Vida Útil Esperada (${unitLabel})`}
              type="number"
              min="0"
              placeholder="Ex: 1000"
              value={roundsLimit}
              onChange={(e) =>
                setRoundsLimit(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          )}

          {unit === 'sessions' && (
            <Input
              label={`Vida Útil Esperada (${unitLabel})`}
              type="number"
              min="0"
              placeholder="Ex: 150"
              value={sessionsLimit}
              onChange={(e) =>
                setSessionsLimit(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          )}

          <Input
            label="Data de Compra"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>

        {/* Componentes para Ciclismo na Criação */}
        {!initialData && category === 'bike' && (
          <div className="p-4 bg-[#161C24] border border-[#1F2937] rounded flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#10B981]" />
                <span className="font-mono text-xs font-bold text-[#D4E4FA] uppercase tracking-wide">
                  Componentes da Bicicleta
                </span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddComponent}
              >
                <Plus className="w-3 h-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <p className="text-[11px] text-[#8F9380]">
              Monitore desgaste de corrente e pneus individualmente com base na quilometragem da bike.
            </p>

            <div className="flex flex-col gap-2">
              {components.map((comp, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center p-2 bg-[#0D1C2D] border border-[#1F2937] rounded"
                >
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      placeholder="Nome (ex: Corrente)"
                      value={comp.name}
                      onChange={(e) => handleUpdateComponent(idx, { name: e.target.value })}
                      className="w-full bg-[#161C24] border border-[#1F2937] rounded px-2.5 py-1.5 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Limite km"
                      value={comp.distanceLimitKm ?? ''}
                      onChange={(e) =>
                        handleUpdateComponent(idx, {
                          distanceLimitKm:
                            e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#161C24] border border-[#1F2937] rounded px-2.5 py-1.5 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                      title="Limite de km antes da troca recomendada"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <input
                      type="number"
                      placeholder="Km já usados"
                      value={comp.alreadyUsedKm ?? 0}
                      onChange={(e) =>
                        handleUpdateComponent(idx, {
                          alreadyUsedKm: Number(e.target.value),
                        })
                      }
                      className="w-full bg-[#161C24] border border-[#1F2937] rounded px-2.5 py-1.5 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                      title="Quilômetros já rodados pelo componente até hoje"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveComponent(idx)}
                      className="text-[#8F9380] hover:text-[#EF4444] p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 p-3 bg-[#161C24] border border-[#1F2937] rounded">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 accent-[#D4F684] bg-transparent border-[#454839]"
          />
          <label
            htmlFor="isDefault"
            className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest cursor-pointer"
          >
            Definir como {meta.singular.toLowerCase()} padrão ({meta.label})
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="tactile"
            isLoading={isLoading}
            disabled={!model}
          >
            {initialData ? 'Salvar Alterações' : `Cadastrar ${meta.singular}`}
          </Button>
        </div>
      </form>
    </Card>
  );
};

/** Alias legado */
export const ShoeForm = GearForm as any;

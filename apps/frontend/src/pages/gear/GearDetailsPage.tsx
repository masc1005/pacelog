import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gearApi } from '../../services/gear.api';
import {
  type Gear,
  getGearComponentUsage,
  GEAR_CATEGORY_META,
} from '@pacelog/shared';
import { Button } from '../../components/ui/Button';
import {
  ChevronLeft,
  Edit3,
  Archive,
  Power,
  Wrench,
  Plus,
  RefreshCw,
  Trash2,
  Check,
} from 'lucide-react';
import { GearCard } from '../../components/gear/GearCard';
import { GearUsageBar } from '../../components/gear/GearUsageBar';
import { Card } from '../../components/ui/Card';

export const GearDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [gear, setGear] = useState<Gear | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Formulário para adicionar novo componente
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [compName, setCompName] = useState('');
  const [compLimitKm, setCompLimitKm] = useState<number | ''>(3000);
  const [compAlreadyUsedKm, setCompAlreadyUsedKm] = useState<number>(0);
  const [isSavingComp, setIsSavingComp] = useState(false);

  useEffect(() => {
    if (id) {
      loadGear(id);
    }
  }, [id]);

  const loadGear = async (gearId: string) => {
    try {
      const data = await gearApi.getGearById(gearId);
      setGear(data);
    } catch (err) {
      console.error('Failed to load gear', err);
      navigate('/gear');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetire = async () => {
    if (!gear) return;
    if (
      confirm(
        `Tem certeza que deseja aposentar ${gear.model}? Ele não aparecerá mais para seleção em novos treinos.`
      )
    ) {
      await gearApi.retireGear(gear.id);
      navigate('/gear');
    }
  };

  const handleArchive = async () => {
    if (!gear) return;
    if (confirm(`Tem certeza que deseja arquivar ${gear.model}?`)) {
      await gearApi.archiveGear(gear.id);
      navigate('/gear');
    }
  };

  const handleSetDefault = async () => {
    if (!gear) return;
    await gearApi.setDefault(gear.id);
    await loadGear(gear.id);
  };

  const handleReplaceComponent = async (componentId: string, componentName: string) => {
    if (!gear) return;
    if (
      confirm(
        `Registrar substituição de "${componentName}"? A quilometragem deste componente será reiniciada a partir da km atual da bike.`
      )
    ) {
      const updated = await gearApi.replaceComponent(gear.id, componentId);
      setGear(updated);
    }
  };

  const handleRemoveComponent = async (componentId: string, componentName: string) => {
    if (!gear) return;
    if (confirm(`Remover o rastreamento do componente "${componentName}"?`)) {
      const updated = await gearApi.removeComponent(gear.id, componentId);
      setGear(updated);
    }
  };

  const handleCreateComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gear || !compName.trim()) return;
    setIsSavingComp(true);
    try {
      const updated = await gearApi.addComponent(gear.id, {
        name: compName.trim(),
        distanceLimitKm: compLimitKm === '' ? undefined : Number(compLimitKm),
        alreadyUsedKm: compAlreadyUsedKm || 0,
      });
      setGear(updated);
      setCompName('');
      setCompLimitKm(3000);
      setCompAlreadyUsedKm(0);
      setIsAddingComponent(false);
    } catch (err) {
      console.error('Failed to add component', err);
      alert('Erro ao adicionar componente');
    } finally {
      setIsSavingComp(false);
    }
  };

  const supportsComponents = gear && GEAR_CATEGORY_META[gear.category]?.supportsComponents;

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-4">
        <Button variant="secondary" onClick={() => navigate('/gear')} className="px-2">
          <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Detalhes do Equipamento
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-[#161C24] border border-[#1F2937] rounded animate-pulse" />
      ) : gear ? (
        <div className="flex flex-col gap-6">
          <GearCard gear={gear} />

          {/* Seção de Componentes (Bicicletas) */}
          {supportsComponents && (
            <div className="flex flex-col gap-3">
              <div className="flex justify-between items-center border-b border-[#1F2937] pb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-[#10B981]" />
                  <h2 className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest font-bold">
                    Componentes da Bicicleta ({gear.components?.length ?? 0})
                  </h2>
                </div>
                {!isAddingComponent && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsAddingComponent(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Novo Componente
                  </Button>
                )}
              </div>

              {isAddingComponent && (
                <Card className="p-4 bg-[#051424] border-[#1F2937]">
                  <form onSubmit={handleCreateComponent} className="flex flex-col gap-3">
                    <span className="font-mono text-xs text-[#D4E4FA] uppercase tracking-wider font-bold">
                      Novo Componente para Rastrear
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block font-mono text-[10px] text-[#8F9380] uppercase mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Corrente KMC, Pneu GP5000"
                          value={compName}
                          onChange={(e) => setCompName(e.target.value)}
                          required
                          className="w-full bg-[#161C24] border border-[#1F2937] rounded px-3 py-2 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[#8F9380] uppercase mb-1">
                          Vida Útil (km)
                        </label>
                        <input
                          type="number"
                          placeholder="Ex: 3000"
                          value={compLimitKm}
                          onChange={(e) =>
                            setCompLimitKm(e.target.value === '' ? '' : Number(e.target.value))
                          }
                          className="w-full bg-[#161C24] border border-[#1F2937] rounded px-3 py-2 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block font-mono text-[10px] text-[#8F9380] uppercase mb-1">
                          Km Já Usados
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={compAlreadyUsedKm}
                          onChange={(e) => setCompAlreadyUsedKm(Number(e.target.value))}
                          className="w-full bg-[#161C24] border border-[#1F2937] rounded px-3 py-2 text-xs text-[#D4E4FA] focus:border-[#D4F684] outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsAddingComponent(false)}
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="tactile"
                        size="sm"
                        isLoading={isSavingComp}
                        disabled={!compName.trim()}
                      >
                        Salvar Componente
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {gear.components && gear.components.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {gear.components.map((comp) => {
                    const usage = getGearComponentUsage(gear, comp);
                    return (
                      <Card
                        key={comp.id}
                        className="p-3 bg-[#0D1C2D] border-[#1F2937] flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-bold text-[#D4E4FA] uppercase tracking-wide">
                              {comp.name}
                            </span>
                            <span className="font-mono text-[10px] text-[#8F9380]">
                              Instalado em {comp.installedAtKm.toFixed(1)} km da bike
                              {comp.replacements > 0 &&
                                ` · ${comp.replacements} substituiç${
                                  comp.replacements === 1 ? 'ão' : 'ões'
                                }`}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReplaceComponent(comp.id, comp.name)}
                              title="Registrar substituição da peça"
                              className="px-2 py-1 rounded bg-[#161C24] border border-[#1F2937] hover:border-[#10B981] text-[#10B981] font-mono text-[10px] uppercase flex items-center gap-1 transition-colors"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Trocar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveComponent(comp.id, comp.name)}
                              title="Remover componente"
                              className="p-1 rounded text-[#8F9380] hover:text-[#EF4444] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <GearUsageBar usage={usage} label="Desgaste da Peça" />
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-[#051424] border border-[#1F2937] border-dashed rounded text-center">
                  <p className="font-mono text-xs text-[#8F9380]">
                    Nenhum componente cadastrado ainda. Monitore corrente, cassete e pneus individualmente.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest border-b border-[#1F2937] pb-2">
              Ações
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(`/gear/${gear.id}/edit`)}
                leftIcon={<Edit3 className="w-4 h-4" />}
                className="justify-start"
              >
                Editar Informações
              </Button>

              {gear.status === 'active' && !gear.isDefault && (
                <Button
                  variant="secondary"
                  onClick={handleSetDefault}
                  leftIcon={<Check className="w-4 h-4 text-[#D4F684]" />}
                  className="justify-start"
                >
                  Definir como Padrão
                </Button>
              )}

              {gear.status === 'active' && (
                <Button
                  variant="secondary"
                  onClick={handleRetire}
                  leftIcon={<Power className="w-4 h-4 text-[#F59E0B]" />}
                  className="justify-start border-[#F59E0B]/30 hover:border-[#F59E0B] hover:bg-[#F59E0B]/10"
                >
                  Aposentar
                </Button>
              )}

              <Button
                variant="secondary"
                onClick={handleArchive}
                leftIcon={<Archive className="w-4 h-4 text-[#EF4444]" />}
                className="justify-start border-[#EF4444]/30 hover:border-[#EF4444] hover:bg-[#EF4444]/10"
              >
                Arquivar
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** Alias legado */
export const ShoeDetailsPage = GearDetailsPage;

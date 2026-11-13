import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gearApi } from '../../services/gear.api';
import {
  type Gear,
  type GearCategory,
  GEAR_CATEGORIES,
} from '@pacelog/shared';
import { Button } from '../../components/ui/Button';
import { GearCard } from '../../components/gear/GearCard';
import { Wrench, Plus, ChevronLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { GEAR_VISUAL_META } from '../../components/gear/gearMeta';

export const GearPage: React.FC = () => {
  const navigate = useNavigate();
  const [gearList, setGearList] = useState<Gear[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<GearCategory | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGear();
  }, []);

  const loadGear = async () => {
    try {
      const data = await gearApi.getGear(true);
      setGearList(data);
    } catch (error) {
      console.error('Failed to load gear', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = selectedCategory === 'all'
    ? gearList
    : gearList.filter((g) => g.category === selectedCategory);

  const activeGear = filtered.filter((g) => g.status === 'active');
  const retiredGear = filtered.filter((g) => g.status === 'retired');

  const handleAddNew = () => {
    const query = selectedCategory !== 'all' ? `?category=${selectedCategory}` : '';
    navigate(`/gear/new${query}`);
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/')} className="px-2">
            <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
              <Wrench className="w-6 h-6 text-[#D4F684]" /> Tracker de Equipamentos
            </h1>
            <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
              Tênis, luvas, kimonos e bikes
            </p>
          </div>
        </div>
        <Button variant="tactile" onClick={handleAddNew} leftIcon={<Plus className="w-4 h-4" />}>
          Adicionar
        </Button>
      </div>

      {/* Filtro por Categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all text-nowrap ${
            selectedCategory === 'all'
              ? 'bg-[#D4F684] text-[#0A1118] font-bold'
              : 'bg-[#161C24] text-[#8F9380] hover:text-[#D4E4FA] border border-[#1F2937]'
          }`}
        >
          Todos ({gearList.length})
        </button>
        {GEAR_CATEGORIES.map((cat) => {
          const meta = GEAR_VISUAL_META[cat];
          const count = gearList.filter((g) => g.category === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-all text-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-[#D4F684] text-[#0A1118] font-bold'
                  : 'bg-[#161C24] text-[#8F9380] hover:text-[#D4E4FA] border border-[#1F2937]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <Card className="h-32 bg-[#161C24] border-[#1F2937]" />
          <Card className="h-32 bg-[#161C24] border-[#1F2937]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[#051424] border border-[#1F2937] border-dashed rounded-lg text-center px-4">
          <Wrench className="w-12 h-12 text-[#1F2937] mb-4" />
          <h2 className="font-display text-lg text-[#C5C8B4] uppercase tracking-wide mb-2">
            Nenhum equipamento {selectedCategory !== 'all' ? 'nesta categoria' : 'cadastrado'}
          </h2>
          <p className="font-mono text-xs text-[#8F9380] mb-6 max-w-xs">
            Acompanhe o desgaste de tênis, rounds de luvas, sessões de kimono e km de componentes de bicicleta.
          </p>
          <Button variant="tactile" onClick={handleAddNew} leftIcon={<Plus className="w-4 h-4" />}>
            Cadastrar Equipamento
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activeGear.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest border-b border-[#1F2937] pb-2">
                Equipamentos Ativos ({activeGear.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {activeGear.map((item) => (
                  <GearCard
                    key={item.id}
                    gear={item}
                    onClick={() => navigate(`/gear/${item.id}`)}
                    onEdit={() => navigate(`/gear/${item.id}/edit`)}
                  />
                ))}
              </div>
            </div>
          )}

          {retiredGear.length > 0 && (
            <div className="flex flex-col gap-4 opacity-70">
              <h2 className="font-mono text-xs text-[#8F9380] uppercase tracking-widest border-b border-[#1F2937] pb-2">
                Aposentados ({retiredGear.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {retiredGear.map((item) => (
                  <GearCard
                    key={item.id}
                    gear={item}
                    onClick={() => navigate(`/gear/${item.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Alias legado */
export const ShoesPage = GearPage;

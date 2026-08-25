import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoeApi } from '../../services/shoe.api';
import type { RunningShoe } from '@pacelog/shared';
import { Button } from '../../components/ui/Button';
import { ShoeCard } from '../../components/shoes/ShoeCard';
import { Footprints, Plus, ChevronLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const ShoesPage: React.FC = () => {
  const navigate = useNavigate();
  const [shoes, setShoes] = useState<RunningShoe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadShoes();
  }, []);

  const loadShoes = async () => {
    try {
      const data = await shoeApi.getShoes(true);
      setShoes(data);
    } catch (error) {
      console.error('Failed to load shoes', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeShoes = shoes.filter(s => s.status === 'active');
  const retiredShoes = shoes.filter(s => s.status === 'retired');

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center justify-between border-b border-[#1F2937] pb-4">
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => navigate('/')} className="px-2">
            <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
          </Button>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
              <Footprints className="w-6 h-6 text-[#38BDF8]" /> Tracker de Tênis
            </h1>
            <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
              Gerencie sua frota de corrida
            </p>
          </div>
        </div>
        <Button variant="tactile" onClick={() => navigate('/shoes/new')} leftIcon={<Plus className="w-4 h-4" />}>
          Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4 animate-pulse">
          <Card className="h-32 bg-[#161C24] border-[#1F2937]" />
          <Card className="h-32 bg-[#161C24] border-[#1F2937]" />
        </div>
      ) : shoes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-[#051424] border border-[#1F2937] border-dashed rounded-lg text-center px-4">
          <Footprints className="w-12 h-12 text-[#1F2937] mb-4" />
          <h2 className="font-display text-lg text-[#C5C8B4] uppercase tracking-wide mb-2">Nenhum tênis cadastrado</h2>
          <p className="font-mono text-xs text-[#8F9380] mb-6 max-w-xs">
            Acompanhe a quilometragem dos seus tênis de corrida para saber a hora exata de trocar.
          </p>
          <Button variant="tactile" onClick={() => navigate('/shoes/new')} leftIcon={<Plus className="w-4 h-4" />}>
            Cadastrar Primeiro Tênis
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {activeShoes.length > 0 && (
            <div className="flex flex-col gap-4">
              <h2 className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest border-b border-[#1F2937] pb-2">
                Tênis Ativos
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {activeShoes.map(shoe => (
                  <ShoeCard 
                    key={shoe.id} 
                    shoe={shoe} 
                    onClick={() => navigate(`/shoes/${shoe.id}`)}
                    onEdit={() => navigate(`/shoes/${shoe.id}/edit`)}
                  />
                ))}
              </div>
            </div>
          )}

          {retiredShoes.length > 0 && (
            <div className="flex flex-col gap-4 opacity-70">
              <h2 className="font-mono text-xs text-[#8F9380] uppercase tracking-widest border-b border-[#1F2937] pb-2">
                Tênis Aposentados
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {retiredShoes.map(shoe => (
                  <ShoeCard 
                    key={shoe.id} 
                    shoe={shoe} 
                    onClick={() => navigate(`/shoes/${shoe.id}`)}
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

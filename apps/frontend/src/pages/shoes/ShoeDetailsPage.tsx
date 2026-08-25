import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shoeApi } from '../../services/shoe.api';
import type { RunningShoe } from '@pacelog/shared';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Edit3, Archive, Power, Footprints } from 'lucide-react';
import { ShoeCard } from '../../components/shoes/ShoeCard';

export const ShoeDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [shoe, setShoe] = useState<RunningShoe | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      shoeApi.getShoeById(id)
        .then(data => {
          setShoe(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Failed to load shoe', err);
          navigate('/shoes');
        });
    }
  }, [id, navigate]);

  const handleRetire = async () => {
    if (!shoe) return;
    if (confirm(`Tem certeza que deseja aposentar o tênis ${shoe.model}? Ele não aparecerá mais para seleção.`)) {
      await shoeApi.retireShoe(shoe.id);
      navigate('/shoes');
    }
  };

  const handleArchive = async () => {
    if (!shoe) return;
    if (confirm(`Tem certeza que deseja arquivar o tênis ${shoe.model}?`)) {
      await shoeApi.archiveShoe(shoe.id);
      navigate('/shoes');
    }
  };

  const handleSetDefault = async () => {
    if (!shoe) return;
    await shoeApi.setDefault(shoe.id);
    navigate('/shoes');
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-4">
        <Button variant="secondary" onClick={() => navigate('/shoes')} className="px-2">
          <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide">
            Detalhes do Tênis
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="h-64 bg-[#161C24] border border-[#1F2937] rounded animate-pulse" />
      ) : shoe ? (
        <div className="flex flex-col gap-6">
          <ShoeCard shoe={shoe} />
          
          <div className="flex flex-col gap-3">
            <h2 className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest border-b border-[#1F2937] pb-2">
              Ações
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button 
                variant="secondary" 
                onClick={() => navigate(`/shoes/${shoe.id}/edit`)}
                leftIcon={<Edit3 className="w-4 h-4" />}
                className="justify-start"
              >
                Editar Informações
              </Button>
              
              {shoe.status === 'active' && !shoe.isDefault && (
                <Button 
                  variant="secondary" 
                  onClick={handleSetDefault}
                  leftIcon={<Footprints className="w-4 h-4 text-[#D4F684]" />}
                  className="justify-start"
                >
                  Definir como Padrão
                </Button>
              )}
              
              {shoe.status === 'active' && (
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

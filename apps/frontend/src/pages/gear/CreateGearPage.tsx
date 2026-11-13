import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { gearApi } from '../../services/gear.api';
import { GearForm } from '../../components/gear/GearForm';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Wrench } from 'lucide-react';
import type { GearCategory } from '@pacelog/shared';

export const CreateGearPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category') as GearCategory | null;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await gearApi.createGear(data);
      navigate('/gear');
    } catch (error) {
      console.error('Failed to create gear', error);
      alert('Erro ao cadastrar o equipamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-4">
        <Button variant="secondary" onClick={() => navigate('/gear')} className="px-2">
          <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#D4F684]" /> Cadastrar Equipamento
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Adicione tênis, luvas, kimono, rashguard ou bike
          </p>
        </div>
      </div>

      <GearForm
        initialCategory={categoryParam || undefined}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/gear')}
        isLoading={isSubmitting}
      />
    </div>
  );
};

/** Alias legado */
export const CreateShoePage = CreateGearPage;

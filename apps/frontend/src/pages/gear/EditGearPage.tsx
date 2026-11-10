import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { gearApi } from '../../services/gear.api';
import type { Gear } from '@pacelog/shared';
import { GearForm } from '../../components/gear/GearForm';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Wrench } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const EditGearPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [gear, setGear] = useState<Gear | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (id) {
      gearApi
        .getGearById(id)
        .then((data) => {
          setGear(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load gear', err);
          navigate('/gear');
        });
    }
  }, [id, navigate]);

  const handleSubmit = async (data: any) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await gearApi.updateGear(id, data);

      if (data.isDefault && !gear?.isDefault) {
        await gearApi.setDefault(id);
      }

      navigate(`/gear/${id}`);
    } catch (error) {
      console.error('Failed to update gear', error);
      alert('Erro ao atualizar o equipamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-4">
        <Button variant="secondary" onClick={() => navigate(id ? `/gear/${id}` : '/gear')} className="px-2">
          <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
            <Wrench className="w-6 h-6 text-[#D4F684]" /> Editar Equipamento
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Atualize as informações do seu {gear?.model || 'equipamento'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="h-64 bg-[#161C24] border-[#1F2937] animate-pulse" />
      ) : gear ? (
        <GearForm
          initialData={gear}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/gear/${id}`)}
          isLoading={isSubmitting}
        />
      ) : null}
    </div>
  );
};

/** Alias legado */
export const EditShoePage = EditGearPage;

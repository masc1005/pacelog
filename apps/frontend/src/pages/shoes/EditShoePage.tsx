import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { shoeApi } from '../../services/shoe.api';
import type { RunningShoe } from '@pacelog/shared';
import { ShoeForm } from '../../components/shoes/ShoeForm';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Footprints } from 'lucide-react';
import { Card } from '../../components/ui/Card';

export const EditShoePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [shoe, setShoe] = useState<RunningShoe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (data: any) => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      await shoeApi.updateShoe(id, data);
      
      if (data.isDefault && !shoe?.isDefault) {
        await shoeApi.setDefault(id);
      }
      
      navigate('/shoes');
    } catch (error) {
      console.error('Failed to update shoe', error);
      alert('Erro ao atualizar o tênis');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans max-w-2xl mx-auto w-full pb-10">
      <div className="flex items-center gap-3 border-b border-[#1F2937] pb-4">
        <Button variant="secondary" onClick={() => navigate('/shoes')} className="px-2">
          <ChevronLeft className="w-5 h-5 text-[#8F9380]" />
        </Button>
        <div>
          <h1 className="font-display text-2xl font-bold text-[#D4E4FA] uppercase tracking-wide flex items-center gap-2">
            <Footprints className="w-6 h-6 text-[#38BDF8]" /> Editar Tênis
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Atualize as informações do seu {shoe?.model || 'tênis'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card className="h-64 bg-[#161C24] border-[#1F2937] animate-pulse" />
      ) : shoe ? (
        <ShoeForm 
          initialData={shoe}
          onSubmit={handleSubmit} 
          onCancel={() => navigate('/shoes')} 
          isLoading={isSubmitting} 
        />
      ) : null}
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shoeApi } from '../../services/shoe.api';
import { ShoeForm } from '../../components/shoes/ShoeForm';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Footprints } from 'lucide-react';

export const CreateShoePage: React.FC = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await shoeApi.createShoe(data);
      navigate('/shoes');
    } catch (error) {
      console.error('Failed to create shoe', error);
      alert('Erro ao cadastrar o tênis');
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
            <Footprints className="w-6 h-6 text-[#38BDF8]" /> Cadastrar Tênis
          </h1>
          <p className="font-mono text-xs text-[#8F9380] mt-1 uppercase">
            Adicione um novo tênis à sua rotação
          </p>
        </div>
      </div>

      <ShoeForm 
        onSubmit={handleSubmit} 
        onCancel={() => navigate('/shoes')} 
        isLoading={isSubmitting} 
      />
    </div>
  );
};

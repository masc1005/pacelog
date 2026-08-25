import React, { useState } from 'react';
import type { RunningShoe } from '@pacelog/shared';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface ShoeFormProps {
  initialData?: RunningShoe;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ShoeForm: React.FC<ShoeFormProps> = ({ initialData, onSubmit, onCancel, isLoading }) => {
  const [model, setModel] = useState(initialData?.model || '');
  const [brand, setBrand] = useState(initialData?.brand || '');
  const [nickname, setNickname] = useState(initialData?.nickname || '');
  const [initialDistanceKm, setInitialDistanceKm] = useState(initialData?.initialDistanceKm || 0);
  const [distanceLimitKm, setDistanceLimitKm] = useState(initialData?.distanceLimitKm || 800);
  const [purchaseDate, setPurchaseDate] = useState(initialData?.purchaseDate ? new Date(initialData.purchaseDate).toISOString().slice(0, 10) : '');
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      model,
      brand: brand || undefined,
      nickname: nickname || undefined,
      initialDistanceKm,
      distanceLimitKm: distanceLimitKm || undefined,
      purchaseDate: purchaseDate ? new Date(purchaseDate).toISOString() : undefined,
      isDefault,
    });
  };

  return (
    <Card className="p-6 bg-[#0D1C2D] border-[#1F2937]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Marca" 
            placeholder="Ex: Nike, Adidas" 
            value={brand} 
            onChange={(e) => setBrand(e.target.value)} 
          />
          <Input 
            label="Modelo *" 
            placeholder="Ex: Pegasus 41" 
            value={model} 
            onChange={(e) => setModel(e.target.value)} 
            required 
          />
        </div>
        
        <Input 
          label="Apelido (Opcional)" 
          placeholder="Ex: Tênis de Treino Leve" 
          value={nickname} 
          onChange={(e) => setNickname(e.target.value)} 
        />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Distância Inicial (km)" 
            type="number" 
            step="0.1" 
            min="0"
            value={initialDistanceKm} 
            onChange={(e) => setInitialDistanceKm(Number(e.target.value))} 
            disabled={!!initialData} // Geralmente não se edita a distância inicial depois de criado
          />
          <Input 
            label="Vida Útil Esperada (km)" 
            type="number" 
            min="0"
            value={distanceLimitKm} 
            onChange={(e) => setDistanceLimitKm(Number(e.target.value))} 
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Data de Compra" 
            type="date" 
            value={purchaseDate} 
            onChange={(e) => setPurchaseDate(e.target.value)} 
          />
        </div>

        <div className="flex items-center gap-3 p-3 bg-[#161C24] border border-[#1F2937] rounded">
          <input 
            type="checkbox" 
            id="isDefault" 
            checked={isDefault} 
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 accent-[#D4F684] bg-transparent border-[#454839]"
          />
          <label htmlFor="isDefault" className="font-mono text-xs text-[#C5C8B4] uppercase tracking-widest cursor-pointer">
            Definir como tênis padrão
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" variant="tactile" isLoading={isLoading} disabled={!model}>
            {initialData ? 'Salvar Alterações' : 'Cadastrar Tênis'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

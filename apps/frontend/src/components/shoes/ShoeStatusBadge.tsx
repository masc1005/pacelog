import React from 'react';
import type { ShoeStatus } from '@pacelog/shared';
import { Badge } from '../ui/Badge';

interface ShoeStatusBadgeProps {
  status: ShoeStatus;
  isDefault?: boolean;
}

export const ShoeStatusBadge: React.FC<ShoeStatusBadgeProps> = ({ status, isDefault }) => {
  if (isDefault) {
    return <Badge variant="sage">Padrão</Badge>;
  }
  
  switch (status) {
    case 'active':
      return <Badge variant="neutral">Ativo</Badge>;
    case 'retired':
      return <Badge variant="amber">Aposentado</Badge>;
    case 'archived':
      return <Badge variant="crimson">Arquivado</Badge>;
    default:
      return null;
  }
};

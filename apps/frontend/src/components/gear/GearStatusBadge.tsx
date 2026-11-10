import React from 'react';
import type { GearStatus } from '@pacelog/shared';
import { Badge } from '../ui/Badge';

interface GearStatusBadgeProps {
  status: GearStatus;
  isDefault?: boolean;
}

export const GearStatusBadge: React.FC<GearStatusBadgeProps> = ({ status, isDefault }) => {
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

/** Alias legado */
export const ShoeStatusBadge = GearStatusBadge;

import {
  House,
  ListChecks,
  ChartNoAxesCombined,
  CircleUserRound,
  Plus,
} from 'lucide-react';

export const primaryNavigation = [
  {
    key: 'home',
    label: 'Início',
    href: '/',
    icon: House,
  },
  {
    key: 'sessions',
    label: 'Sessões',
    href: '/sessions',
    icon: ListChecks,
  },
  {
    key: 'create',
    label: 'Registrar',
    action: 'open-session-creator' as const,
    icon: Plus,
  },
  {
    key: 'progress',
    label: 'Progresso',
    href: '/progress',
    icon: ChartNoAxesCombined,
  },
  {
    key: 'profile',
    label: 'Perfil',
    href: '/profile',
    icon: CircleUserRound,
  },
] as const;

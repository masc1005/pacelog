import { Footprints, Zap, Bike, Shield, Shirt, type LucideIcon } from 'lucide-react';
import { GEAR_CATEGORY_META, type GearCategory } from '@pacelog/shared';

export interface GearVisualMeta {
  category: GearCategory;
  label: string;
  singular: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
}

export const GEAR_VISUAL_META: Record<GearCategory, GearVisualMeta> = {
  running_shoe: {
    category: 'running_shoe',
    label: GEAR_CATEGORY_META.running_shoe.label,
    singular: GEAR_CATEGORY_META.running_shoe.singular,
    icon: Footprints,
    color: '#38BDF8',
    bgColor: 'rgba(56, 189, 248, 0.12)',
  },
  boxing_gloves: {
    category: 'boxing_gloves',
    label: GEAR_CATEGORY_META.boxing_gloves.label,
    singular: GEAR_CATEGORY_META.boxing_gloves.singular,
    icon: Zap,
    color: '#FF6B35',
    bgColor: 'rgba(255, 107, 53, 0.12)',
  },
  jiujitsu_gi: {
    category: 'jiujitsu_gi',
    label: GEAR_CATEGORY_META.jiujitsu_gi.label,
    singular: GEAR_CATEGORY_META.jiujitsu_gi.singular,
    icon: Shield,
    color: '#E11D48',
    bgColor: 'rgba(225, 29, 72, 0.12)',
  },
  rashguard: {
    category: 'rashguard',
    label: GEAR_CATEGORY_META.rashguard.label,
    singular: GEAR_CATEGORY_META.rashguard.singular,
    icon: Shirt,
    color: '#F59E0B',
    bgColor: 'rgba(245, 158, 11, 0.12)',
  },
  bike: {
    category: 'bike',
    label: GEAR_CATEGORY_META.bike.label,
    singular: GEAR_CATEGORY_META.bike.singular,
    icon: Bike,
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
  },
};

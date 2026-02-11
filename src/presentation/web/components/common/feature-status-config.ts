import { CircleAlert, Loader2, CircleCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FeatureStatus = 'action-needed' | 'in-progress' | 'done';

export interface FeatureStatusConfig {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  label: string;
}

export const featureStatusConfig: Record<FeatureStatus, FeatureStatusConfig> = {
  'action-needed': {
    icon: CircleAlert,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    label: 'Action Needed',
  },
  'in-progress': {
    icon: Loader2,
    iconClass: 'text-blue-500 animate-spin',
    bgClass: 'bg-blue-500/10',
    label: 'In Progress',
  },
  done: {
    icon: CircleCheck,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    label: 'Done',
  },
};

export const featureStatusOrder: FeatureStatus[] = ['action-needed', 'in-progress', 'done'];

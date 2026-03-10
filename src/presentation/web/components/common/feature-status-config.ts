import { CircleAlert, Loader2, CircleCheck, Ban, CircleX } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FeatureStatus = 'action-needed' | 'in-progress' | 'blocked' | 'error' | 'done';

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
  blocked: {
    icon: Ban,
    iconClass: 'text-gray-400',
    bgClass: 'bg-gray-400/10',
    label: 'Blocked',
  },
  error: {
    icon: CircleX,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    label: 'Error',
  },
  done: {
    icon: CircleCheck,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    label: 'Done',
  },
};

export const featureStatusOrder: FeatureStatus[] = [
  'action-needed',
  'error',
  'blocked',
  'in-progress',
  'done',
];

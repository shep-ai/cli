import { CircleAlert, Loader2, CircleCheck, Ban, CircleX, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FeatureStatus =
  | 'action-needed'
  | 'in-progress'
  | 'pending'
  | 'blocked'
  | 'error'
  | 'done';

export interface FeatureStatusConfig {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  /** i18n translation key under the `web` namespace (e.g. `sidebar.statusActionNeeded`). */
  labelKey: string;
}

export const featureStatusConfig: Record<FeatureStatus, FeatureStatusConfig> = {
  'action-needed': {
    icon: CircleAlert,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    labelKey: 'sidebar.statusActionNeeded',
  },
  'in-progress': {
    icon: Loader2,
    iconClass: 'text-blue-500 animate-spin',
    bgClass: 'bg-blue-500/10',
    labelKey: 'sidebar.statusInProgress',
  },
  pending: {
    icon: Clock,
    iconClass: 'text-slate-400',
    bgClass: 'bg-slate-400/10',
    labelKey: 'sidebar.statusPending',
  },
  blocked: {
    icon: Ban,
    iconClass: 'text-gray-400',
    bgClass: 'bg-gray-400/10',
    labelKey: 'sidebar.statusBlocked',
  },
  error: {
    icon: CircleX,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-500/10',
    labelKey: 'sidebar.statusError',
  },
  done: {
    icon: CircleCheck,
    iconClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
    labelKey: 'sidebar.statusDone',
  },
};

export const featureStatusOrder: FeatureStatus[] = [
  'action-needed',
  'error',
  'blocked',
  'in-progress',
  'pending',
  'done',
];

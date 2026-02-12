import { Loader2, CircleAlert, CircleCheck, Ban, CircleX, type LucideIcon } from 'lucide-react';
import type { Node } from '@xyflow/react';

export type FeatureNodeState = 'running' | 'action-required' | 'done' | 'blocked' | 'error';

export type FeatureLifecyclePhase =
  | 'requirements'
  | 'plan'
  | 'implementation'
  | 'test'
  | 'deploy'
  | 'maintenance';

export interface FeatureNodeData {
  [key: string]: unknown;
  name: string;
  description?: string;
  featureId: string;
  lifecycle: FeatureLifecyclePhase;
  state: FeatureNodeState;
  progress: number;
  onAction?: () => void;
  onSettings?: () => void;
}

export type FeatureNodeType = Node<FeatureNodeData, 'featureNode'>;

export interface FeatureNodeStateConfig {
  icon: LucideIcon;
  borderClass: string;
  labelClass: string;
  progressClass: string;
  label: string;
}

export const featureNodeStateConfig: Record<FeatureNodeState, FeatureNodeStateConfig> = {
  running: {
    icon: Loader2,
    borderClass: 'border-l-blue-500',
    labelClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
    label: 'Running',
  },
  'action-required': {
    icon: CircleAlert,
    borderClass: 'border-l-amber-500',
    labelClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
    label: 'Action Required',
  },
  done: {
    icon: CircleCheck,
    borderClass: 'border-l-emerald-500',
    labelClass: 'text-emerald-500',
    progressClass: 'bg-emerald-500',
    label: 'Done',
  },
  blocked: {
    icon: Ban,
    borderClass: 'border-l-gray-400',
    labelClass: 'text-gray-400',
    progressClass: 'bg-gray-400',
    label: 'Blocked',
  },
  error: {
    icon: CircleX,
    borderClass: 'border-l-red-500',
    labelClass: 'text-red-500',
    progressClass: 'bg-red-500',
    label: 'Error',
  },
};

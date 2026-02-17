import { Loader2, CircleAlert, CircleCheck, Ban, CircleX, type LucideIcon } from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { AgentTypeValue } from './agent-type-icons';

export type FeatureNodeState = 'running' | 'action-required' | 'done' | 'blocked' | 'error';

export type FeatureLifecyclePhase =
  | 'requirements'
  | 'research'
  | 'implementation'
  | 'review'
  | 'deploy'
  | 'maintain';

/** Human-readable display labels for lifecycle phases. */
export const lifecycleDisplayLabels: Record<FeatureLifecyclePhase, string> = {
  requirements: 'REQUIREMENTS',
  research: 'RESEARCH',
  implementation: 'IMPLEMENTATION',
  review: 'REVIEW',
  deploy: 'DEPLOY & QA',
  maintain: 'COMPLETED',
};

/** Present-participle verbs for the running badge, keyed by lifecycle phase. */
export const lifecycleRunningVerbs: Record<FeatureLifecyclePhase, string> = {
  requirements: 'Analyzing',
  research: 'Researching',
  implementation: 'Implementing',
  review: 'Reviewing',
  deploy: 'Deploying',
  maintain: 'Maintaining',
};

export interface FeatureNodeData {
  [key: string]: unknown;
  name: string;
  description?: string;
  featureId: string;
  lifecycle: FeatureLifecyclePhase;
  state: FeatureNodeState;
  progress: number;
  /** Absolute path to the repository on disk */
  repositoryPath: string;
  /** Git branch name for this feature */
  branch: string;
  /** Human-readable runtime for done state (e.g. "2h 15m") */
  runtime?: string;
  /** Feature name this node is blocked by */
  blockedBy?: string;
  /** Short error message for error state */
  errorMessage?: string;
  /** Agent executor type (e.g. "claude-code", "cursor"). */
  agentType?: AgentTypeValue;
  onAction?: () => void;
  onSettings?: () => void;
  showHandles?: boolean;
}

export type FeatureNodeType = Node<FeatureNodeData, 'featureNode'>;

export interface FeatureNodeStateConfig {
  icon: LucideIcon;
  borderClass: string;
  labelClass: string;
  progressClass: string;
  badgeClass: string;
  badgeBgClass: string;
  label: string;
  showProgressBar: boolean;
}

export const featureNodeStateConfig: Record<FeatureNodeState, FeatureNodeStateConfig> = {
  running: {
    icon: Loader2,
    borderClass: 'border-l-blue-500',
    labelClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
    badgeClass: 'text-blue-700',
    badgeBgClass: 'bg-blue-50',
    label: 'Running',
    showProgressBar: false,
  },
  'action-required': {
    icon: CircleAlert,
    borderClass: 'border-l-amber-500',
    labelClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
    badgeClass: 'text-amber-700',
    badgeBgClass: 'bg-amber-50',
    label: 'User action required',
    showProgressBar: false,
  },
  done: {
    icon: CircleCheck,
    borderClass: 'border-l-emerald-500',
    labelClass: 'text-emerald-500',
    progressClass: 'bg-emerald-500',
    badgeClass: 'text-emerald-700',
    badgeBgClass: 'bg-emerald-50',
    label: 'Done',
    showProgressBar: false,
  },
  blocked: {
    icon: Ban,
    borderClass: 'border-l-gray-400',
    labelClass: 'text-gray-400',
    progressClass: 'bg-gray-400',
    badgeClass: 'text-gray-600',
    badgeBgClass: 'bg-gray-100',
    label: 'Blocked',
    showProgressBar: false,
  },
  error: {
    icon: CircleX,
    borderClass: 'border-l-red-500',
    labelClass: 'text-red-500',
    progressClass: 'bg-red-500',
    badgeClass: 'text-red-700',
    badgeBgClass: 'bg-red-50',
    label: 'Error',
    showProgressBar: false,
  },
};

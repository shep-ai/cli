import {
  Loader2,
  CircleAlert,
  CircleCheck,
  Ban,
  CircleX,
  FileText,
  Search,
  Code,
  GitPullRequest,
  Rocket,
  Wrench,
  GitMerge,
  type LucideIcon,
} from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { PrStatus, CiStatus, DeploymentState } from '@shepai/core/domain/generated/output';
import type { AgentTypeValue } from './agent-type-icons';

export type FeatureNodeState =
  | 'creating'
  | 'running'
  | 'action-required'
  | 'done'
  | 'blocked'
  | 'error';

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

/** Stage-relevant icons for the status row, keyed by lifecycle phase. */
export const lifecycleStageIcons: Record<FeatureLifecyclePhase, LucideIcon> = {
  requirements: FileText,
  research: Search,
  implementation: Code,
  review: GitPullRequest,
  deploy: Rocket,
  maintain: Wrench,
};

/** Lifecycle-specific icon overrides for the action-required state. */
export const actionRequiredLifecycleIcons: Partial<Record<FeatureLifecyclePhase, LucideIcon>> = {
  requirements: FileText,
  implementation: Wrench,
  review: GitMerge,
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
  /** Absolute path to the specs folder on disk */
  specPath?: string;
  /** Epoch ms when the current agent run started (for elapsed-time in sidebar) */
  startedAt?: number;
  /** Human-readable runtime for done state (e.g. "2h 15m") */
  runtime?: string;
  /** Feature name this node is blocked by */
  blockedBy?: string;
  /** Short error message for error state */
  errorMessage?: string;
  /** Whether the feature was created in fast mode (skip SDLC phases). */
  fastMode?: boolean;
  /** Agent executor type (e.g. "claude-code", "cursor"). */
  agentType?: AgentTypeValue;
  /** LLM model identifier used for this feature's agent run. */
  modelId?: string;
  /** Feature summary / user query */
  summary?: string;
  /** Epoch ms or ISO string when the feature was created */
  createdAt?: string | number;
  /** Repository display name (e.g. "my-repo") */
  repositoryName?: string;
  /** Remote URL for the repository (HTTPS, suitable for browser linking) */
  remoteUrl?: string;
  /** Base branch the feature was branched from (e.g. "main") */
  baseBranch?: string;
  /** AI-generated one-line description of the feature (from spec artifact) */
  oneLiner?: string;
  /** Original user query that initiated this feature */
  userQuery?: string;
  /** PR metadata for features with an associated pull request */
  pr?: {
    url: string;
    number: number;
    status: PrStatus;
    ciStatus?: CiStatus;
    commitHash?: string;
  };
  /** Deployment status for features with an active deployment */
  deployment?: {
    status: DeploymentState;
    url?: string;
  };
  onAction?: () => void;
  onSettings?: () => void;
  onDelete?: (featureId: string, cleanup?: boolean) => void;
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
}

export const featureNodeStateConfig: Record<FeatureNodeState, FeatureNodeStateConfig> = {
  creating: {
    icon: Loader2,
    borderClass: 'border-l-blue-500',
    labelClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
    badgeClass: 'text-blue-700',
    badgeBgClass: 'bg-blue-50',
    label: 'Creating...',
  },
  running: {
    icon: Loader2,
    borderClass: 'border-l-blue-500',
    labelClass: 'text-blue-500',
    progressClass: 'bg-blue-500',
    badgeClass: 'text-blue-700',
    badgeBgClass: 'bg-blue-50',
    label: 'Running',
  },
  'action-required': {
    icon: CircleAlert,
    borderClass: 'border-l-amber-500',
    labelClass: 'text-amber-500',
    progressClass: 'bg-amber-500',
    badgeClass: 'text-amber-700',
    badgeBgClass: 'bg-amber-50',
    label: 'User action required',
  },
  done: {
    icon: CircleCheck,
    borderClass: 'border-l-emerald-500',
    labelClass: 'text-emerald-500',
    progressClass: 'bg-emerald-500',
    badgeClass: 'text-emerald-700',
    badgeBgClass: 'bg-emerald-50',
    label: 'Done',
  },
  blocked: {
    icon: Ban,
    borderClass: 'border-l-gray-400',
    labelClass: 'text-gray-400',
    progressClass: 'bg-gray-400',
    badgeClass: 'text-gray-600',
    badgeBgClass: 'bg-gray-100',
    label: 'Blocked',
  },
  error: {
    icon: CircleX,
    borderClass: 'border-l-red-500',
    labelClass: 'text-red-500',
    progressClass: 'bg-red-500',
    badgeClass: 'text-red-700',
    badgeBgClass: 'bg-red-50',
    label: 'Error',
  },
};

/**
 * Spec YAML Parser
 *
 * Parses raw YAML strings from spec artifact files into their TypeSpec-generated types.
 * Each parser handles the mapping between YAML field names and TypeSpec type shapes,
 * including enum mapping, null→undefined conversion, and default values.
 */

import yaml from 'js-yaml';
import { randomUUID } from 'node:crypto';
import type {
  FeatureArtifact,
  ResearchArtifact,
  TechnicalPlanArtifact,
  TasksArtifact,
  FeatureStatus,
  OpenQuestion,
  QuestionOption,
  TechDecision,
  PlanPhase,
  SpecTask,
  TddCycle,
  FeatureIdentity,
  FeatureStatusInfo,
  FeatureStatusProgress,
  FeatureValidation,
  FeatureTaskTracking,
  FeatureCheckpoint,
  FeatureErrors,
} from '../generated/output.js';
import { SdlcLifecycle, TaskState } from '../generated/output.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert null values to undefined (YAML null → TypeScript optional) */
function nullToUndefined<T>(value: T | null | undefined): T | undefined {
  return value === null || value === undefined ? undefined : value;
}

/** Generate ISO timestamp string for the current moment */
function nowIso(): string {
  return new Date().toISOString();
}

/** Parse a YAML string and return the raw object */
function loadYaml(content: string): Record<string, unknown> {
  return yaml.load(content) as Record<string, unknown>;
}

/** Ensure a value is an array, defaulting to [] */
function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

// ---------------------------------------------------------------------------
// Enum Mappers
// ---------------------------------------------------------------------------

const SDLC_LIFECYCLE_MAP: Record<string, SdlcLifecycle> = {
  Started: SdlcLifecycle.Started,
  Analyze: SdlcLifecycle.Analyze,
  Requirements: SdlcLifecycle.Requirements,
  Research: SdlcLifecycle.Research,
  Planning: SdlcLifecycle.Planning,
  Implementation: SdlcLifecycle.Implementation,
  Review: SdlcLifecycle.Review,
  Maintain: SdlcLifecycle.Maintain,
};

const TASK_STATE_MAP: Record<string, TaskState> = {
  Todo: TaskState.Todo,
  'Work in Progress': TaskState.WIP,
  WIP: TaskState.WIP,
  Done: TaskState.Done,
  Review: TaskState.Review,
};

function mapSdlcLifecycle(value: string): SdlcLifecycle {
  const mapped = SDLC_LIFECYCLE_MAP[value];
  if (!mapped) {
    throw new Error(`Unknown SdlcLifecycle value: "${value}"`);
  }
  return mapped;
}

function mapTaskState(value: string): TaskState {
  const mapped = TASK_STATE_MAP[value];
  if (!mapped) {
    throw new Error(`Unknown TaskState value: "${value}"`);
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Sub-object Parsers
// ---------------------------------------------------------------------------

function parseQuestionOption(raw: Record<string, unknown>): QuestionOption {
  return {
    option: raw.option as string,
    description: raw.description as string,
    selected: raw.selected as boolean,
  };
}

function parseOpenQuestion(raw: Record<string, unknown>): OpenQuestion {
  const result: OpenQuestion = {
    question: raw.question as string,
    resolved: raw.resolved as boolean,
  };

  if (raw.options) {
    result.options = ensureArray<Record<string, unknown>>(raw.options).map(parseQuestionOption);
  }
  if (raw.selectionRationale != null) {
    result.selectionRationale = String(raw.selectionRationale).trim();
  }
  if (raw.answer != null) {
    result.answer = String(raw.answer).trim();
  }

  return result;
}

function parseTechDecision(raw: Record<string, unknown>): TechDecision {
  return {
    title: raw.title as string,
    chosen: String(raw.chosen).trim(),
    rejected: ensureArray<string>(raw.rejected).map((r) => String(r).trim()),
    rationale: String(raw.rationale).trim(),
  };
}

function parsePlanPhase(raw: Record<string, unknown>): PlanPhase {
  return {
    id: raw.id as string,
    name: raw.name as string,
    description: nullToUndefined(raw.description != null ? String(raw.description).trim() : null),
    parallel: (raw.parallel as boolean) ?? false,
    taskIds: raw.taskIds ? ensureArray<string>(raw.taskIds) : undefined,
  };
}

function parseTddCycle(raw: Record<string, unknown>): TddCycle {
  return {
    red: ensureArray<string>(raw.red),
    green: ensureArray<string>(raw.green),
    refactor: ensureArray<string>(raw.refactor),
  };
}

function parseSpecTask(raw: Record<string, unknown>): SpecTask {
  return {
    id: raw.id as string,
    phaseId: raw.phaseId as string,
    title: raw.title as string,
    description: String(raw.description).trim(),
    state: mapTaskState(raw.state as string),
    dependencies: ensureArray<string>(raw.dependencies),
    acceptanceCriteria: ensureArray<string>(raw.acceptanceCriteria),
    tdd: raw.tdd ? parseTddCycle(raw.tdd as Record<string, unknown>) : undefined,
    estimatedEffort: raw.estimatedEffort as string,
  };
}

// ---------------------------------------------------------------------------
// Shared SpecArtifactBase fields extractor
// ---------------------------------------------------------------------------

function extractBaseFields(raw: Record<string, unknown>) {
  const now = nowIso();
  return {
    id: (raw.id as string) ?? randomUUID(),
    createdAt: (raw.createdAt as string) ?? now,
    updatedAt: (raw.updatedAt as string) ?? now,
    name: raw.name as string,
    summary: String(raw.summary ?? '').trim(),
    content: String(raw.content ?? '').trim(),
    technologies: ensureArray<string>(raw.technologies),
    relatedFeatures: ensureArray<string>(raw.relatedFeatures),
    relatedLinks: ensureArray<string>(raw.relatedLinks),
    openQuestions: ensureArray<Record<string, unknown>>(raw.openQuestions).map(parseOpenQuestion),
  };
}

// ---------------------------------------------------------------------------
// Public Parsers
// ---------------------------------------------------------------------------

/**
 * Parse a spec.yaml string into a FeatureArtifact object.
 */
export function parseSpecYaml(content: string): FeatureArtifact {
  const raw = loadYaml(content);
  const base = extractBaseFields(raw);

  return {
    ...base,
    number: Number(raw.number),
    branch: raw.branch as string,
    oneLiner: String(raw.oneLiner ?? '').trim(),
    phase: mapSdlcLifecycle(raw.phase as string),
    sizeEstimate: raw.sizeEstimate as string,
  };
}

/**
 * Parse a research.yaml string into a ResearchArtifact object.
 */
export function parseResearchYaml(content: string): ResearchArtifact {
  const raw = loadYaml(content);
  const base = extractBaseFields(raw);

  return {
    ...base,
    decisions: ensureArray<Record<string, unknown>>(raw.decisions).map(parseTechDecision),
  };
}

/**
 * Parse a plan.yaml string into a TechnicalPlanArtifact object.
 */
export function parsePlanYaml(content: string): TechnicalPlanArtifact {
  const raw = loadYaml(content);
  const base = extractBaseFields(raw);

  return {
    ...base,
    phases: ensureArray<Record<string, unknown>>(raw.phases).map(parsePlanPhase),
    filesToCreate: ensureArray<string>(raw.filesToCreate),
    filesToModify: ensureArray<string>(raw.filesToModify),
  };
}

/**
 * Parse a tasks.yaml string into a TasksArtifact object.
 */
export function parseTasksYaml(content: string): TasksArtifact {
  const raw = loadYaml(content);
  const base = extractBaseFields(raw);

  return {
    ...base,
    tasks: ensureArray<Record<string, unknown>>(raw.tasks).map(parseSpecTask),
    totalEstimate: raw.totalEstimate as string,
  };
}

/**
 * Parse a feature.yaml string into a FeatureStatus object.
 */
export function parseFeatureStatusYaml(content: string): FeatureStatus {
  const raw = loadYaml(content);
  const now = nowIso();

  const rawFeature = raw.feature as Record<string, unknown>;
  const rawStatus = raw.status as Record<string, unknown>;
  const rawProgress = rawStatus.progress as Record<string, unknown>;
  const rawValidation = raw.validation as Record<string, unknown>;
  const rawTasks = raw.tasks as Record<string, unknown>;
  const rawCheckpoints = ensureArray<Record<string, unknown>>(raw.checkpoints);
  const rawErrors = raw.errors as Record<string, unknown>;

  const feature: FeatureIdentity = {
    id: rawFeature.id as string,
    name: rawFeature.name as string,
    number: Number(rawFeature.number),
    branch: rawFeature.branch as string,
    lifecycle: rawFeature.lifecycle as string,
    createdAt: rawFeature.createdAt as string,
  };

  const progress: FeatureStatusProgress = {
    completed: rawProgress.completed as number,
    total: rawProgress.total as number,
    percentage: rawProgress.percentage as number,
  };

  const status: FeatureStatusInfo = {
    phase: rawStatus.phase as string,
    completedPhases: nullToUndefined(
      rawStatus.completedPhases != null ? ensureArray<string>(rawStatus.completedPhases) : null
    ),
    progress,
    currentTask: nullToUndefined(rawStatus.currentTask as string | null),
    lastUpdated: rawStatus.lastUpdated as string,
    lastUpdatedBy: rawStatus.lastUpdatedBy as string,
  };

  const validation: FeatureValidation = {
    lastRun: nullToUndefined(rawValidation.lastRun as string | null),
    gatesPassed: ensureArray<string>(rawValidation.gatesPassed),
    autoFixesApplied: ensureArray<string>(rawValidation.autoFixesApplied),
  };

  const tasks: FeatureTaskTracking = {
    current: nullToUndefined(rawTasks.current as string | null),
    blocked: ensureArray<string>(rawTasks.blocked),
    failed: ensureArray<string>(rawTasks.failed),
  };

  const checkpoints: FeatureCheckpoint[] = rawCheckpoints.map((cp) => ({
    phase: cp.phase as string,
    completedAt: cp.completedAt as string,
    completedBy: cp.completedBy as string,
  }));

  const errors: FeatureErrors = {
    current: nullToUndefined(rawErrors.current as string | null),
    history: ensureArray<string>(rawErrors.history),
  };

  return {
    id: (raw.id as string) ?? randomUUID(),
    createdAt: (raw.createdAt as string) ?? now,
    updatedAt: (raw.updatedAt as string) ?? now,
    feature,
    status,
    prUrl: nullToUndefined(raw.prUrl as string | null),
    mergedAt: nullToUndefined(raw.mergedAt as string | null),
    validation,
    tasks,
    checkpoints,
    errors,
  };
}

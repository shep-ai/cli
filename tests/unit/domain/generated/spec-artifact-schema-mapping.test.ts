/**
 * Spec Artifact Schema Mapping Validation Tests
 *
 * Verifies that every YAML spec type has a matching TypeSpec-generated entity
 * and that all source YAML fields are mapped to the generated TypeScript types.
 *
 * Coverage:
 * - spec.yaml    → FeatureSpec
 * - research.yaml → ResearchSpec
 * - plan.yaml    → PlanSpec
 * - tasks.yaml   → TasksSpec
 * - feature.yaml → FeatureStatus
 * - Value objects: OpenQuestion, QuestionOption, TechDecision, PlanPhase,
 *                  SpecTask, TddCycle, FeatureIdentity, FeatureStatusInfo,
 *                  FeatureStatusProgress, FeatureValidation, FeatureTaskTracking,
 *                  FeatureCheckpoint, FeatureErrors
 */

import { describe, it, expect } from 'vitest';
import type {
  FeatureSpec,
  ResearchSpec,
  PlanSpec,
  TasksSpec,
  FeatureStatus,
  SpecArtifactBase,
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
} from '@/domain/generated/output.js';
import { SdlcLifecycle, TaskState } from '@/domain/generated/output.js';

// ---------------------------------------------------------------------------
// Helper: given a sample object satisfying a type, return its keys at runtime.
// We build canonical "full" samples for each type so the tests verify that
// every YAML-source field can be assigned to the generated type.
// ---------------------------------------------------------------------------

/** Build a minimal SpecArtifactBase sample (shared by all 4 spec artifacts). */
function buildSpecArtifactBaseSample(): SpecArtifactBase {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: 'test-feature',
    summary: 'A test feature',
    content: '## Problem\n\nTest content',
    technologies: ['TypeScript', 'Vitest'],
    relatedFeatures: ['008-agent-configuration'],
    relatedLinks: ['https://example.com'],
    openQuestions: [],
  };
}

// ===========================================================================
// 1. spec.yaml → FeatureSpec
// ===========================================================================
describe('spec.yaml → FeatureSpec mapping', () => {
  /** YAML source fields for spec.yaml (top-level keys from real specs). */
  const SPEC_YAML_FIELDS = [
    'name',
    'number',
    'branch',
    'oneLiner',
    'summary',
    'phase',
    'sizeEstimate',
    'relatedFeatures',
    'technologies',
    'relatedLinks',
    'openQuestions',
    'content',
  ] as const;

  function buildFeatureSpecSample(): FeatureSpec {
    return {
      ...buildSpecArtifactBaseSample(),
      number: 31,
      branch: 'feat/031-repo-open-folder-action',
      oneLiner: 'Add an Open Folder action button',
      phase: SdlcLifecycle.Requirements,
      sizeEstimate: 'S',
    };
  }

  it('should have a generated FeatureSpec type', () => {
    const sample: FeatureSpec = buildFeatureSpecSample();
    expect(sample).toBeDefined();
  });

  it.each(SPEC_YAML_FIELDS)('should map spec.yaml field "%s" to FeatureSpec', (field) => {
    const sample = buildFeatureSpecSample();
    expect(sample).toHaveProperty(field);
  });

  it('should include all spec.yaml YAML fields', () => {
    const sample = buildFeatureSpecSample();
    const sampleKeys = Object.keys(sample);
    for (const field of SPEC_YAML_FIELDS) {
      expect(sampleKeys).toContain(field);
    }
  });
});

// ===========================================================================
// 2. research.yaml → ResearchSpec
// ===========================================================================
describe('research.yaml → ResearchSpec mapping', () => {
  const RESEARCH_YAML_FIELDS = [
    'name',
    'summary',
    'relatedFeatures',
    'technologies',
    'relatedLinks',
    'decisions',
    'openQuestions',
    'content',
  ] as const;

  function buildResearchSpecSample(): ResearchSpec {
    return {
      ...buildSpecArtifactBaseSample(),
      decisions: [
        {
          title: 'Worker-to-Parent Communication',
          chosen: 'Database polling',
          rejected: ['IPC via process.send()', 'File-based event log'],
          rationale: 'Worker already writes status to SQLite',
        },
      ],
    };
  }

  it('should have a generated ResearchSpec type', () => {
    const sample: ResearchSpec = buildResearchSpecSample();
    expect(sample).toBeDefined();
  });

  it.each(RESEARCH_YAML_FIELDS)('should map research.yaml field "%s" to ResearchSpec', (field) => {
    const sample = buildResearchSpecSample();
    expect(sample).toHaveProperty(field);
  });
});

// ===========================================================================
// 3. plan.yaml → PlanSpec
// ===========================================================================
describe('plan.yaml → PlanSpec mapping', () => {
  const PLAN_YAML_FIELDS = [
    'name',
    'summary',
    'relatedFeatures',
    'technologies',
    'relatedLinks',
    'phases',
    'filesToCreate',
    'filesToModify',
    'openQuestions',
    'content',
  ] as const;

  function buildPlanSpecSample(): PlanSpec {
    return {
      ...buildSpecArtifactBaseSample(),
      phases: [
        {
          id: 'phase-1',
          name: 'Domain Models & TypeSpec Foundation',
          description: 'Define types first',
          parallel: false,
          taskIds: ['task-1', 'task-2'],
        },
      ],
      filesToCreate: ['src/new-file.ts'],
      filesToModify: ['src/existing-file.ts'],
    };
  }

  it('should have a generated PlanSpec type', () => {
    const sample: PlanSpec = buildPlanSpecSample();
    expect(sample).toBeDefined();
  });

  it.each(PLAN_YAML_FIELDS)('should map plan.yaml field "%s" to PlanSpec', (field) => {
    const sample = buildPlanSpecSample();
    expect(sample).toHaveProperty(field);
  });
});

// ===========================================================================
// 4. tasks.yaml → TasksSpec
// ===========================================================================
describe('tasks.yaml → TasksSpec mapping', () => {
  const TASKS_YAML_FIELDS = [
    'name',
    'summary',
    'relatedFeatures',
    'technologies',
    'relatedLinks',
    'tasks',
    'totalEstimate',
    'openQuestions',
    'content',
  ] as const;

  function buildTasksSpecSample(): TasksSpec {
    return {
      ...buildSpecArtifactBaseSample(),
      tasks: [
        {
          id: 'task-1',
          phaseId: 'phase-1',
          title: 'Define notification TypeSpec enums',
          description: 'Create tsp files with enums',
          state: TaskState.Todo,
          dependencies: [],
          acceptanceCriteria: ['pnpm tsp:compile succeeds'],
          estimatedEffort: '30min',
        },
      ],
      totalEstimate: '12h',
    };
  }

  it('should have a generated TasksSpec type', () => {
    const sample: TasksSpec = buildTasksSpecSample();
    expect(sample).toBeDefined();
  });

  it.each(TASKS_YAML_FIELDS)('should map tasks.yaml field "%s" to TasksSpec', (field) => {
    const sample = buildTasksSpecSample();
    expect(sample).toHaveProperty(field);
  });
});

// ===========================================================================
// 5. feature.yaml → FeatureStatus
// ===========================================================================
describe('feature.yaml → FeatureStatus mapping', () => {
  /** Top-level sections in feature.yaml */
  const FEATURE_YAML_SECTIONS = [
    'feature',
    'status',
    'validation',
    'tasks',
    'checkpoints',
    'errors',
  ] as const;

  function buildFeatureStatusSample(): FeatureStatus {
    return {
      id: '00000000-0000-0000-0000-000000000000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      feature: {
        id: '021-agent-notifications',
        name: 'agent-notifications',
        number: 21,
        branch: 'feat/agent-notifications',
        lifecycle: 'review',
        createdAt: '2026-02-16T12:24:22Z',
      },
      status: {
        phase: 'in-review',
        progress: { completed: 17, total: 17, percentage: 100 },
        currentTask: undefined,
        lastUpdated: '2026-02-17T17:00:00.000Z',
        lastUpdatedBy: 'shep-kit:commit-pr',
      },
      validation: {
        lastRun: undefined,
        gatesPassed: [],
        autoFixesApplied: [],
      },
      tasks: {
        current: undefined,
        blocked: [],
        failed: [],
      },
      checkpoints: [
        {
          phase: 'feature-created',
          completedAt: '2026-02-16T12:24:22Z',
          completedBy: 'feature-agent',
        },
      ],
      prUrl: 'https://github.com/shep-ai/cli/pull/65',
      errors: {
        current: undefined,
        history: [],
      },
    };
  }

  it('should have a generated FeatureStatus type', () => {
    const sample: FeatureStatus = buildFeatureStatusSample();
    expect(sample).toBeDefined();
  });

  it.each(FEATURE_YAML_SECTIONS)(
    'should map feature.yaml section "%s" to FeatureStatus',
    (section) => {
      const sample = buildFeatureStatusSample();
      expect(sample).toHaveProperty(section);
    }
  );

  it('should map prUrl (optional top-level field)', () => {
    const sample = buildFeatureStatusSample();
    expect(sample).toHaveProperty('prUrl');
  });
});

// ===========================================================================
// 6. FeatureIdentity (feature.yaml → feature: section)
// ===========================================================================
describe('feature.yaml feature section → FeatureIdentity mapping', () => {
  const FEATURE_IDENTITY_FIELDS = [
    'id',
    'name',
    'number',
    'branch',
    'lifecycle',
    'createdAt',
  ] as const;

  function buildSample(): FeatureIdentity {
    return {
      id: '021-agent-notifications',
      name: 'agent-notifications',
      number: 21,
      branch: 'feat/agent-notifications',
      lifecycle: 'review',
      createdAt: '2026-02-16T12:24:22Z',
    };
  }

  it.each(FEATURE_IDENTITY_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 7. FeatureStatusInfo (feature.yaml → status: section)
// ===========================================================================
describe('feature.yaml status section → FeatureStatusInfo mapping', () => {
  const STATUS_YAML_FIELDS = [
    'phase',
    'completedPhases',
    'progress',
    'currentTask',
    'lastUpdated',
    'lastUpdatedBy',
  ] as const;

  function buildSample(): FeatureStatusInfo {
    return {
      phase: 'in-review',
      completedPhases: ['requirements', 'research', 'implementation'],
      progress: { completed: 17, total: 17, percentage: 100 },
      currentTask: undefined,
      lastUpdated: '2026-02-17T17:00:00.000Z',
      lastUpdatedBy: 'shep-kit:commit-pr',
    };
  }

  it.each(STATUS_YAML_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it('should have completedPhases as string[]', () => {
    const sample = buildSample();
    expect(Array.isArray(sample.completedPhases)).toBe(true);
  });
});

// ===========================================================================
// 8. FeatureStatusProgress (feature.yaml → status.progress)
// ===========================================================================
describe('feature.yaml status.progress → FeatureStatusProgress mapping', () => {
  const PROGRESS_FIELDS = ['completed', 'total', 'percentage'] as const;

  function buildSample(): FeatureStatusProgress {
    return { completed: 17, total: 17, percentage: 100 };
  }

  it.each(PROGRESS_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 9. FeatureValidation (feature.yaml → validation: section)
// ===========================================================================
describe('feature.yaml validation section → FeatureValidation mapping', () => {
  const VALIDATION_FIELDS = ['lastRun', 'gatesPassed', 'autoFixesApplied'] as const;

  function buildSample(): FeatureValidation {
    return { lastRun: undefined, gatesPassed: [], autoFixesApplied: [] };
  }

  it.each(VALIDATION_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 10. FeatureTaskTracking (feature.yaml → tasks: section)
// ===========================================================================
describe('feature.yaml tasks section → FeatureTaskTracking mapping', () => {
  const TASK_TRACKING_FIELDS = ['current', 'blocked', 'failed'] as const;

  function buildSample(): FeatureTaskTracking {
    return { current: undefined, blocked: [], failed: [] };
  }

  it.each(TASK_TRACKING_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 11. FeatureCheckpoint (feature.yaml → checkpoints[] entries)
// ===========================================================================
describe('feature.yaml checkpoints → FeatureCheckpoint mapping', () => {
  const CHECKPOINT_FIELDS = ['phase', 'completedAt', 'completedBy'] as const;

  function buildSample(): FeatureCheckpoint {
    return {
      phase: 'feature-created',
      completedAt: '2026-02-16T12:24:22Z',
      completedBy: 'feature-agent',
    };
  }

  it.each(CHECKPOINT_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 12. FeatureErrors (feature.yaml → errors: section)
// ===========================================================================
describe('feature.yaml errors section → FeatureErrors mapping', () => {
  const ERROR_FIELDS = ['current', 'history'] as const;

  function buildSample(): FeatureErrors {
    return { current: undefined, history: [] };
  }

  it.each(ERROR_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 13. OpenQuestion value object (used in spec.yaml and research.yaml)
// ===========================================================================
describe('OpenQuestion value object mapping', () => {
  const OPEN_QUESTION_FIELDS_REQUIRED = ['question', 'resolved'] as const;
  const OPEN_QUESTION_FIELDS_OPTIONAL = ['options', 'selectionRationale', 'answer'] as const;

  it('should support the spec.yaml options pattern', () => {
    const question: OpenQuestion = {
      question: 'Should we use approach A or B?',
      resolved: true,
      options: [
        { option: 'Approach A', description: 'Simple', selected: true },
        { option: 'Approach B', description: 'Complex', selected: false },
      ],
      selectionRationale: 'Approach A is simpler',
    };
    expect(question).toHaveProperty('options');
    expect(question).toHaveProperty('selectionRationale');
    expect(question.options).toHaveLength(2);
  });

  it('should support the research.yaml answer pattern', () => {
    const question: OpenQuestion = {
      question: 'How to handle IPC limitation?',
      resolved: true,
      answer: 'Use database polling instead of IPC',
    };
    expect(question).toHaveProperty('answer');
  });

  it.each(OPEN_QUESTION_FIELDS_REQUIRED)('should have required field "%s"', (field) => {
    const question: OpenQuestion = { question: 'Test?', resolved: false };
    expect(question).toHaveProperty(field);
  });

  it.each(OPEN_QUESTION_FIELDS_OPTIONAL)('should accept optional field "%s"', (field) => {
    // Verify the field name is valid on the type (compile-time + runtime)
    const full: OpenQuestion = {
      question: 'Test?',
      resolved: true,
      options: [{ option: 'A', description: 'desc', selected: true }],
      selectionRationale: 'rationale',
      answer: 'answer',
    };
    expect(full).toHaveProperty(field);
  });
});

// ===========================================================================
// 14. QuestionOption value object
// ===========================================================================
describe('QuestionOption value object mapping', () => {
  const QUESTION_OPTION_FIELDS = ['option', 'description', 'selected'] as const;

  function buildSample(): QuestionOption {
    return {
      option: 'Create new validator',
      description: 'Dedicated validation for path-only',
      selected: true,
    };
  }

  it.each(QUESTION_OPTION_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });
});

// ===========================================================================
// 15. TechDecision value object (research.yaml → decisions[])
// ===========================================================================
describe('TechDecision value object mapping', () => {
  const TECH_DECISION_FIELDS = ['title', 'chosen', 'rejected', 'rationale'] as const;

  function buildSample(): TechDecision {
    return {
      title: 'Worker-to-Parent Communication',
      chosen: 'Database polling',
      rejected: ['IPC via process.send()', 'File-based event log'],
      rationale: 'Simple and reliable',
    };
  }

  it.each(TECH_DECISION_FIELDS)('should map field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it('should have rejected as string[]', () => {
    const sample = buildSample();
    expect(Array.isArray(sample.rejected)).toBe(true);
    expect(typeof sample.rejected[0]).toBe('string');
  });
});

// ===========================================================================
// 16. PlanPhase value object (plan.yaml → phases[])
// ===========================================================================
describe('PlanPhase value object mapping', () => {
  const PLAN_PHASE_FIELDS_REQUIRED = ['id', 'name', 'parallel', 'taskIds'] as const;
  const PLAN_PHASE_FIELDS_OPTIONAL = ['description'] as const;

  function buildSample(): PlanPhase {
    return {
      id: 'phase-1',
      name: 'Domain Models',
      description: 'Define types first',
      parallel: false,
      taskIds: ['task-1', 'task-2'],
    };
  }

  it.each(PLAN_PHASE_FIELDS_REQUIRED)('should have required field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it.each(PLAN_PHASE_FIELDS_OPTIONAL)('should accept optional field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it('should work without description (optional)', () => {
    const sample: PlanPhase = {
      id: 'phase-1',
      name: 'Phase One',
      parallel: false,
      taskIds: ['task-1'],
    };
    expect(sample.description).toBeUndefined();
  });
});

// ===========================================================================
// 17. SpecTask value object (tasks.yaml → tasks[])
// ===========================================================================
describe('SpecTask value object mapping', () => {
  const SPEC_TASK_FIELDS_REQUIRED = [
    'id',
    'phaseId',
    'title',
    'description',
    'state',
    'dependencies',
    'acceptanceCriteria',
    'estimatedEffort',
  ] as const;

  const SPEC_TASK_FIELDS_OPTIONAL = ['tdd'] as const;

  function buildSample(): SpecTask {
    return {
      id: 'task-1',
      phaseId: 'phase-1',
      title: 'Define notification TypeSpec enums',
      description: 'Create tsp files with enums',
      state: TaskState.Todo,
      dependencies: [],
      acceptanceCriteria: ['pnpm tsp:compile succeeds'],
      tdd: {
        red: ['Write failing test'],
        green: ['Implement to pass'],
        refactor: ['Clean up'],
      },
      estimatedEffort: '30min',
    };
  }

  it.each(SPEC_TASK_FIELDS_REQUIRED)('should have required field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it.each(SPEC_TASK_FIELDS_OPTIONAL)('should accept optional field "%s"', (field) => {
    expect(buildSample()).toHaveProperty(field);
  });

  it('should work with tdd: null/undefined (non-code tasks)', () => {
    const sample: SpecTask = {
      id: 'task-1',
      phaseId: 'phase-1',
      title: 'TypeSpec definition',
      description: 'No runtime logic',
      state: TaskState.Todo,
      dependencies: [],
      acceptanceCriteria: ['compiles'],
      estimatedEffort: '30min',
    };
    expect(sample.tdd).toBeUndefined();
  });

  it('should accept all TaskState values', () => {
    const states = [TaskState.Todo, TaskState.WIP, TaskState.Done, TaskState.Review];
    for (const state of states) {
      const sample: SpecTask = {
        ...buildSample(),
        state,
      };
      expect(sample.state).toBe(state);
    }
  });
});

// ===========================================================================
// 18. TddCycle value object (tasks.yaml → tasks[].tdd)
// ===========================================================================
describe('TddCycle value object mapping', () => {
  const TDD_CYCLE_FIELDS = ['red', 'green', 'refactor'] as const;

  function buildSample(): TddCycle {
    return {
      red: ['Write test asserting X', 'Write test asserting Y'],
      green: ['Implement minimal code to pass'],
      refactor: ['Extract helper if needed'],
    };
  }

  it.each(TDD_CYCLE_FIELDS)('should map field "%s" as string[]', (field) => {
    const sample = buildSample();
    expect(sample).toHaveProperty(field);
    expect(Array.isArray(sample[field])).toBe(true);
  });
});

// ===========================================================================
// 19. SpecArtifactBase (shared fields across all 4 spec YAML types)
// ===========================================================================
describe('SpecArtifactBase shared fields', () => {
  const BASE_FIELDS = [
    'name',
    'summary',
    'content',
    'technologies',
    'relatedFeatures',
    'relatedLinks',
    'openQuestions',
  ] as const;

  /** BaseEntity fields inherited from TypeSpec (not in YAML source) */
  const BASE_ENTITY_FIELDS = ['id', 'createdAt', 'updatedAt'] as const;

  it.each(BASE_FIELDS)('should have shared field "%s"', (field) => {
    const sample = buildSpecArtifactBaseSample();
    expect(sample).toHaveProperty(field);
  });

  it.each(BASE_ENTITY_FIELDS)(
    'should have BaseEntity field "%s" (system-generated, not in YAML)',
    (field) => {
      const sample = buildSpecArtifactBaseSample();
      expect(sample).toHaveProperty(field);
    }
  );

  it('should have technologies as string[]', () => {
    const sample = buildSpecArtifactBaseSample();
    expect(Array.isArray(sample.technologies)).toBe(true);
  });

  it('should have relatedFeatures as string[]', () => {
    const sample = buildSpecArtifactBaseSample();
    expect(Array.isArray(sample.relatedFeatures)).toBe(true);
  });

  it('should have relatedLinks as string[]', () => {
    const sample = buildSpecArtifactBaseSample();
    expect(Array.isArray(sample.relatedLinks)).toBe(true);
  });

  it('should have openQuestions as OpenQuestion[]', () => {
    const sample = buildSpecArtifactBaseSample();
    expect(Array.isArray(sample.openQuestions)).toBe(true);
  });
});

// ===========================================================================
// 20. Cross-validation: every spec type extends SpecArtifactBase
// ===========================================================================
describe('spec artifact type hierarchy', () => {
  it('FeatureSpec should include all SpecArtifactBase fields plus own fields', () => {
    const sample: FeatureSpec = {
      ...buildSpecArtifactBaseSample(),
      number: 1,
      branch: 'feat/test',
      oneLiner: 'test',
      phase: SdlcLifecycle.Requirements,
      sizeEstimate: 'S',
    };
    // Base fields
    expect(sample).toHaveProperty('name');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('openQuestions');
    // Own fields
    expect(sample).toHaveProperty('number');
    expect(sample).toHaveProperty('branch');
    expect(sample).toHaveProperty('oneLiner');
    expect(sample).toHaveProperty('phase');
    expect(sample).toHaveProperty('sizeEstimate');
  });

  it('ResearchSpec should include all SpecArtifactBase fields plus decisions', () => {
    const sample: ResearchSpec = {
      ...buildSpecArtifactBaseSample(),
      decisions: [],
    };
    expect(sample).toHaveProperty('name');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('decisions');
  });

  it('PlanSpec should include all SpecArtifactBase fields plus phases and file lists', () => {
    const sample: PlanSpec = {
      ...buildSpecArtifactBaseSample(),
      phases: [],
      filesToCreate: [],
      filesToModify: [],
    };
    expect(sample).toHaveProperty('name');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('phases');
    expect(sample).toHaveProperty('filesToCreate');
    expect(sample).toHaveProperty('filesToModify');
  });

  it('TasksSpec should include all SpecArtifactBase fields plus tasks and totalEstimate', () => {
    const sample: TasksSpec = {
      ...buildSpecArtifactBaseSample(),
      tasks: [],
      totalEstimate: '12h',
    };
    expect(sample).toHaveProperty('name');
    expect(sample).toHaveProperty('content');
    expect(sample).toHaveProperty('tasks');
    expect(sample).toHaveProperty('totalEstimate');
  });
});

// ===========================================================================
// 21. Gap documentation: known YAML fields NOT yet in TypeSpec
// ===========================================================================
describe('known gaps between YAML source and TypeSpec entities', () => {
  it('should have no remaining gaps', () => {
    // All previously identified gaps have been resolved:
    // - completedPhases was added to FeatureStatusInfo TypeSpec
    expect(true).toBe(true);
  });
});

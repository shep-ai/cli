# YAML Validation & Auto-Repair Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add LangGraph validate-repair loops after each YAML-producing node so malformed AI outputs are automatically detected and fixed.

**Architecture:** Paired validate/repair nodes per producer, wired with conditional edges. Schema validators are pure functions returning `{valid, errors[]}`. Repair nodes send broken YAML + errors to the executor with constrained options.

**Tech Stack:** LangGraph (StateGraph, Annotation, conditional edges), js-yaml, Vitest

---

## Task 1: Shared Validation Types & Helpers

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/schemas/validation.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/validation.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/validation.test.ts
import { describe, it, expect } from 'vitest';
import {
  requireString,
  requireNonEmptyArray,
  requireArrayOfShape,
  type ValidationResult,
} from '../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/validation.js';

describe('validation helpers', () => {
  describe('requireString', () => {
    it('returns no errors for a valid string', () => {
      const errors: string[] = [];
      requireString({ name: 'hello' }, 'name', errors);
      expect(errors).toEqual([]);
    });

    it('adds error for missing field', () => {
      const errors: string[] = [];
      requireString({}, 'name', errors);
      expect(errors).toEqual(["Missing required string field 'name'"]);
    });

    it('adds error for non-string field', () => {
      const errors: string[] = [];
      requireString({ name: 123 }, 'name', errors);
      expect(errors).toEqual(["Field 'name' must be a string, got number"]);
    });

    it('adds error for empty string', () => {
      const errors: string[] = [];
      requireString({ name: '' }, 'name', errors);
      expect(errors).toEqual(["Field 'name' must not be empty"]);
    });
  });

  describe('requireNonEmptyArray', () => {
    it('returns no errors for a non-empty array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: [1, 2] }, 'items', errors);
      expect(errors).toEqual([]);
    });

    it('adds error for missing field', () => {
      const errors: string[] = [];
      requireNonEmptyArray({}, 'items', errors);
      expect(errors).toEqual(["Missing required array field 'items'"]);
    });

    it('adds error for non-array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: 'not-array' }, 'items', errors);
      expect(errors).toEqual(["Field 'items' must be an array, got string"]);
    });

    it('adds error for empty array', () => {
      const errors: string[] = [];
      requireNonEmptyArray({ items: [] }, 'items', errors);
      expect(errors).toEqual(["Field 'items' must not be empty"]);
    });
  });

  describe('requireArrayOfShape', () => {
    it('validates each item with the provided checker', () => {
      const errors: string[] = [];
      const data = { decisions: [{ title: 'A', chosen: 'B' }] };
      requireArrayOfShape(data, 'decisions', errors, (item, idx, errs) => {
        requireString(item as Record<string, unknown>, 'title', errs, `decisions[${idx}].`);
        requireString(item as Record<string, unknown>, 'chosen', errs, `decisions[${idx}].`);
      });
      expect(errors).toEqual([]);
    });

    it('reports errors with indexed paths', () => {
      const errors: string[] = [];
      const data = { decisions: [{ title: 'A' }, { chosen: 'B' }] };
      requireArrayOfShape(data, 'decisions', errors, (item, idx, errs) => {
        requireString(item as Record<string, unknown>, 'title', errs, `decisions[${idx}].`);
        requireString(item as Record<string, unknown>, 'chosen', errs, `decisions[${idx}].`);
      });
      expect(errors).toEqual([
        "Missing required string field 'decisions[0].chosen'",
        "Missing required string field 'decisions[1].title'",
      ]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/validation.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/schemas/validation.ts

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function requireString(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  prefix = ''
): void {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push(`Missing required string field '${prefix}${field}'`);
  } else if (typeof val !== 'string') {
    errors.push(`Field '${prefix}${field}' must be a string, got ${typeof val}`);
  } else if (val.trim() === '') {
    errors.push(`Field '${prefix}${field}' must not be empty`);
  }
}

export function requireNonEmptyArray(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  prefix = ''
): unknown[] | null {
  const val = data[field];
  if (val === undefined || val === null) {
    errors.push(`Missing required array field '${prefix}${field}'`);
    return null;
  }
  if (!Array.isArray(val)) {
    errors.push(`Field '${prefix}${field}' must be an array, got ${typeof val}`);
    return null;
  }
  if (val.length === 0) {
    errors.push(`Field '${prefix}${field}' must not be empty`);
    return null;
  }
  return val;
}

export function requireArrayOfShape(
  data: Record<string, unknown>,
  field: string,
  errors: string[],
  itemChecker: (item: unknown, index: number, errors: string[]) => void,
  prefix = ''
): void {
  const arr = requireNonEmptyArray(data, field, errors, prefix);
  if (!arr) return;
  for (let i = 0; i < arr.length; i++) {
    itemChecker(arr[i], i, errors);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/validation.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/schemas/validation.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/validation.test.ts
git commit -m "feat(agents): add shared YAML validation helpers"
```

---

## Task 2: Spec Schema Validator

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.test.ts
import { describe, it, expect } from 'vitest';
import {
  validateSpecAnalyze,
  validateSpecRequirements,
} from '../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.js';

const validAnalyzeSpec = {
  name: 'test-feature',
  oneLiner: 'A test feature',
  summary: 'This is a test feature for validation',
  phase: 'Analysis',
  sizeEstimate: 'M',
  technologies: ['TypeScript'],
  content: '## Problem Statement\nSome content here',
};

describe('validateSpecAnalyze', () => {
  it('passes for a valid analyze spec', () => {
    const result = validateSpecAnalyze(validAnalyzeSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when name is missing', () => {
    const { name: _, ...data } = validAnalyzeSpec;
    const result = validateSpecAnalyze(data);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required string field 'name'");
  });

  it('fails when technologies is empty', () => {
    const result = validateSpecAnalyze({ ...validAnalyzeSpec, technologies: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Field 'technologies' must not be empty");
  });

  it('fails when sizeEstimate is invalid', () => {
    const result = validateSpecAnalyze({ ...validAnalyzeSpec, sizeEstimate: 'Huge' });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('sizeEstimate');
    expect(result.errors[0]).toContain('S, M, L, XL');
  });

  it('fails for null input', () => {
    const result = validateSpecAnalyze(null);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('YAML parsed to null or non-object');
  });
});

const validRequirementsSpec = {
  ...validAnalyzeSpec,
  phase: 'Requirements',
  openQuestions: [{ question: 'Should we use X?', resolved: true, answer: 'Yes because...' }],
};

describe('validateSpecRequirements', () => {
  it('passes for a valid requirements spec', () => {
    const result = validateSpecRequirements(validRequirementsSpec);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when openQuestions is missing', () => {
    const { openQuestions: _, ...data } = validRequirementsSpec;
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('openQuestions');
  });

  it('fails when openQuestion item missing question field', () => {
    const data = {
      ...validRequirementsSpec,
      openQuestions: [{ resolved: true, answer: 'Yes' }],
    };
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('question');
  });

  it('passes when openQuestions is empty array (no questions is valid)', () => {
    const data = { ...validRequirementsSpec, openQuestions: [] };
    const result = validateSpecRequirements(data);
    expect(result.valid).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.ts
import { requireString, requireNonEmptyArray, type ValidationResult } from './validation.js';

const VALID_SIZE_ESTIMATES = ['S', 'M', 'L', 'XL'];

function validateBaseSpec(data: unknown, errors: string[]): data is Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return false;
  }
  const d = data as Record<string, unknown>;
  requireString(d, 'name', errors);
  requireString(d, 'oneLiner', errors);
  requireString(d, 'summary', errors);
  requireString(d, 'phase', errors);
  requireString(d, 'content', errors);
  requireNonEmptyArray(d, 'technologies', errors);

  if (typeof d.sizeEstimate === 'string' && !VALID_SIZE_ESTIMATES.includes(d.sizeEstimate)) {
    errors.push(
      `Field 'sizeEstimate' must be one of ${VALID_SIZE_ESTIMATES.join(', ')}, got '${d.sizeEstimate}'`
    );
  } else if (typeof d.sizeEstimate !== 'string') {
    requireString(d, 'sizeEstimate', errors);
  }

  return true;
}

export function validateSpecAnalyze(data: unknown): ValidationResult {
  const errors: string[] = [];
  validateBaseSpec(data, errors);
  return { valid: errors.length === 0, errors };
}

export function validateSpecRequirements(data: unknown): ValidationResult {
  const errors: string[] = [];
  if (!validateBaseSpec(data, errors)) return { valid: false, errors };

  const d = data as Record<string, unknown>;
  // openQuestions is required to exist but can be empty (no questions is fine)
  if (!('openQuestions' in d)) {
    errors.push("Missing required field 'openQuestions'");
  } else if (Array.isArray(d.openQuestions)) {
    for (let i = 0; i < d.openQuestions.length; i++) {
      const q = d.openQuestions[i] as Record<string, unknown>;
      if (!q || typeof q !== 'object') {
        errors.push(`openQuestions[${i}] must be an object`);
        continue;
      }
      requireString(q, 'question', errors, `openQuestions[${i}].`);
    }
  } else {
    errors.push("Field 'openQuestions' must be an array");
  }

  return { valid: errors.length === 0, errors };
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/spec.schema.test.ts
git commit -m "feat(agents): add spec.yaml schema validators"
```

---

## Task 3: Research Schema Validator

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.test.ts
import { describe, it, expect } from 'vitest';
import { validateResearch } from '../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.js';

const validResearch = {
  name: 'test-feature',
  summary: 'Research findings summary',
  decisions: [
    {
      title: 'Database Choice',
      chosen: 'SQLite',
      rejected: ['PostgreSQL', 'MongoDB'],
      rationale: 'Lightweight and embedded',
    },
  ],
  content: '## Technology Decisions\nSome content',
};

describe('validateResearch', () => {
  it('passes for valid research', () => {
    const result = validateResearch(validResearch);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when decisions is empty', () => {
    const result = validateResearch({ ...validResearch, decisions: [] });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Field 'decisions' must not be empty");
  });

  it('fails when a decision missing title', () => {
    const data = {
      ...validResearch,
      decisions: [{ chosen: 'X', rejected: ['Y'], rationale: 'Z' }],
    };
    const result = validateResearch(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('decisions[0].title');
  });

  it('fails when a decision missing rejected array', () => {
    const data = {
      ...validResearch,
      decisions: [{ title: 'A', chosen: 'B', rationale: 'C' }],
    };
    const result = validateResearch(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('decisions[0].rejected');
  });

  it('fails for null input', () => {
    const result = validateResearch(null);
    expect(result.valid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.ts
import {
  requireString,
  requireArrayOfShape,
  requireNonEmptyArray,
  type ValidationResult,
} from './validation.js';

export function validateResearch(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;
  requireString(d, 'name', errors);
  requireString(d, 'summary', errors);
  requireString(d, 'content', errors);

  requireArrayOfShape(d, 'decisions', errors, (item, idx, errs) => {
    const decision = item as Record<string, unknown>;
    if (!decision || typeof decision !== 'object') {
      errs.push(`decisions[${idx}] must be an object`);
      return;
    }
    requireString(decision, 'title', errs, `decisions[${idx}].`);
    requireString(decision, 'chosen', errs, `decisions[${idx}].`);
    requireNonEmptyArray(decision, 'rejected', errs, `decisions[${idx}].`);
    requireString(decision, 'rationale', errs, `decisions[${idx}].`);
  });

  return { valid: errors.length === 0, errors };
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/research.schema.test.ts
git commit -m "feat(agents): add research.yaml schema validator"
```

---

## Task 4: Plan + Tasks Schema Validators

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.test.ts
import { describe, it, expect } from 'vitest';
import {
  validatePlan,
  validateTasks,
} from '../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.js';

const validPlan = {
  phases: [
    { id: 'phase-1', name: 'Foundation', parallel: false },
    { id: 'phase-2', name: 'Implementation', parallel: true },
  ],
  filesToCreate: ['src/new-file.ts'],
  filesToModify: ['src/existing.ts'],
  content: '## Architecture Overview\nSome content',
};

const validTasks = {
  tasks: [
    {
      id: 'task-1',
      phaseId: 'phase-1',
      title: 'Create foundation',
      state: 'Todo',
      acceptanceCriteria: ['Tests pass'],
    },
    {
      id: 'task-2',
      phaseId: 'phase-2',
      title: 'Implement feature',
      state: 'Todo',
      acceptanceCriteria: ['Feature works'],
    },
  ],
};

describe('validatePlan', () => {
  it('passes for valid plan', () => {
    const result = validatePlan(validPlan);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when phases is empty', () => {
    const result = validatePlan({ ...validPlan, phases: [] });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('phases');
  });

  it('fails when phase missing id', () => {
    const data = { ...validPlan, phases: [{ name: 'X', parallel: false }] };
    const result = validatePlan(data);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('phases[0].id');
  });

  it('fails when both filesToCreate and filesToModify are empty', () => {
    const result = validatePlan({
      ...validPlan,
      filesToCreate: [],
      filesToModify: [],
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('filesToCreate');
    expect(result.errors[0]).toContain('filesToModify');
  });

  it('passes when only filesToCreate is non-empty', () => {
    const result = validatePlan({ ...validPlan, filesToModify: [] });
    expect(result.valid).toBe(true);
  });
});

describe('validateTasks', () => {
  const phaseIds = ['phase-1', 'phase-2'];

  it('passes for valid tasks with matching phaseIds', () => {
    const result = validateTasks(validTasks, phaseIds);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('fails when tasks is empty', () => {
    const result = validateTasks({ tasks: [] }, phaseIds);
    expect(result.valid).toBe(false);
  });

  it('fails when task phaseId does not match any phase', () => {
    const data = {
      tasks: [{ ...validTasks.tasks[0], phaseId: 'nonexistent-phase' }],
    };
    const result = validateTasks(data, phaseIds);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('nonexistent-phase');
    expect(result.errors[0]).toContain('tasks[0]');
  });

  it('fails when task missing acceptanceCriteria', () => {
    const data = {
      tasks: [{ id: 'task-1', phaseId: 'phase-1', title: 'X', state: 'Todo' }],
    };
    const result = validateTasks(data, phaseIds);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('acceptanceCriteria');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.ts
import {
  requireString,
  requireNonEmptyArray,
  requireArrayOfShape,
  type ValidationResult,
} from './validation.js';

export function validatePlan(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;
  requireString(d, 'content', errors);

  requireArrayOfShape(d, 'phases', errors, (item, idx, errs) => {
    const phase = item as Record<string, unknown>;
    if (!phase || typeof phase !== 'object') {
      errs.push(`phases[${idx}] must be an object`);
      return;
    }
    requireString(phase, 'id', errs, `phases[${idx}].`);
    requireString(phase, 'name', errs, `phases[${idx}].`);
    if (typeof phase.parallel !== 'boolean') {
      errs.push(`phases[${idx}].parallel must be a boolean`);
    }
  });

  // At least one of filesToCreate or filesToModify must be non-empty
  const ftc = Array.isArray(d.filesToCreate) ? d.filesToCreate : [];
  const ftm = Array.isArray(d.filesToModify) ? d.filesToModify : [];
  if (ftc.length === 0 && ftm.length === 0) {
    errors.push("At least one of 'filesToCreate' or 'filesToModify' must be non-empty");
  }

  return { valid: errors.length === 0, errors };
}

export function validateTasks(data: unknown, phaseIds: string[]): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('YAML parsed to null or non-object');
    return { valid: false, errors };
  }

  const d = data as Record<string, unknown>;

  requireArrayOfShape(d, 'tasks', errors, (item, idx, errs) => {
    const task = item as Record<string, unknown>;
    if (!task || typeof task !== 'object') {
      errs.push(`tasks[${idx}] must be an object`);
      return;
    }
    requireString(task, 'id', errs, `tasks[${idx}].`);
    requireString(task, 'title', errs, `tasks[${idx}].`);
    requireString(task, 'state', errs, `tasks[${idx}].`);
    requireNonEmptyArray(task, 'acceptanceCriteria', errs, `tasks[${idx}].`);

    if (typeof task.phaseId === 'string' && !phaseIds.includes(task.phaseId)) {
      errs.push(
        `tasks[${idx}].phaseId '${task.phaseId}' does not match any phase (valid: ${phaseIds.join(', ')})`
      );
    } else if (typeof task.phaseId !== 'string') {
      requireString(task, 'phaseId', errs, `tasks[${idx}].`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.test.ts
git commit -m "feat(agents): add plan.yaml and tasks.yaml schema validators"
```

---

## Task 5: Validate Node Factory

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/validate.node.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/validate.node.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/validate.node.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Mock process.stdout/stderr to suppress node logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

import { createValidateNode } from '../../../../../../src/infrastructure/services/agents/feature-agent/nodes/validate.node.js';
import type { FeatureAgentState } from '../../../../../../src/infrastructure/services/agents/feature-agent/state.js';

describe('createValidateNode', () => {
  let tempDir: string;
  let specDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-validate-test-'));
    specDir = join(tempDir, 'specs', 'test');
    mkdirSync(specDir, { recursive: true });
  });

  function makeState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
    return {
      featureId: 'feat-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      currentNode: 'test',
      error: null,
      approvalGates: undefined,
      messages: [],
      validationRetries: 0,
      lastValidationTarget: '',
      lastValidationErrors: [],
      ...overrides,
    } as FeatureAgentState;
  }

  it('returns empty errors on valid YAML', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\nvalue: 42\n');
    const schema = vi.fn().mockReturnValue({ valid: true, errors: [] });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors).toEqual([]);
    expect(result.validationRetries).toBe(0);
    expect(schema).toHaveBeenCalledWith({ name: 'hello', value: 42 });
  });

  it('returns errors on schema failure and increments retries', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\n');
    const schema = vi.fn().mockReturnValue({
      valid: false,
      errors: ["Missing required field 'value'"],
    });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors).toEqual(["Missing required field 'value'"]);
    expect(result.validationRetries).toBe(1);
    expect(result.lastValidationTarget).toBe('test.yaml');
  });

  it('returns parse error when YAML is malformed', async () => {
    writeFileSync(join(specDir, 'test.yaml'), '  bad:\n indent\n  broken');
    const schema = vi.fn();
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors.length).toBe(1);
    expect(result.lastValidationErrors[0]).toContain('YAML parse error');
    expect(result.validationRetries).toBe(1);
    expect(schema).not.toHaveBeenCalled();
  });

  it('accumulates retry count across invocations', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\n');
    const schema = vi.fn().mockReturnValue({
      valid: false,
      errors: ['bad'],
    });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState({ validationRetries: 2 }));
    expect(result.validationRetries).toBe(3);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/validate.node.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/validate.node.ts
import type { FeatureAgentState } from '../state.js';
import type { ValidationResult } from './schemas/validation.js';
import { readSpecFile, safeYamlLoad, createNodeLogger } from './node-helpers.js';

type SchemaValidator = (data: unknown) => ValidationResult;

/**
 * Factory that creates a validate node for a specific YAML file.
 *
 * On success: resets validationRetries to 0, clears errors.
 * On failure: increments validationRetries, sets errors for repair node.
 */
export function createValidateNode(
  filename: string,
  schema: SchemaValidator
): (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>> {
  const log = createNodeLogger(`validate:${filename}`);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info(`Validating ${filename}`);

    const content = readSpecFile(state.specDir, filename);
    if (!content) {
      const errors = [`File '${filename}' not found or empty in ${state.specDir}`];
      log.error(errors[0]);
      return {
        lastValidationTarget: filename,
        lastValidationErrors: errors,
        validationRetries: state.validationRetries + 1,
        messages: [`[validate:${filename}] FAIL: ${errors[0]}`],
      };
    }

    // Try to parse
    let parsed: unknown;
    try {
      parsed = safeYamlLoad(content);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const errors = [`YAML parse error in ${filename}: ${msg}`];
      log.error(errors[0]);
      return {
        lastValidationTarget: filename,
        lastValidationErrors: errors,
        validationRetries: state.validationRetries + 1,
        messages: [`[validate:${filename}] FAIL: parse error`],
      };
    }

    // Run schema validation
    const result = schema(parsed);
    if (result.valid) {
      log.info('Validation passed');
      return {
        lastValidationTarget: filename,
        lastValidationErrors: [],
        validationRetries: 0,
        messages: [`[validate:${filename}] PASS`],
      };
    }

    log.error(`Validation failed: ${result.errors.join('; ')}`);
    return {
      lastValidationTarget: filename,
      lastValidationErrors: result.errors,
      validationRetries: state.validationRetries + 1,
      messages: [`[validate:${filename}] FAIL: ${result.errors.length} error(s)`],
    };
  };
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/validate.node.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/validate.node.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/validate.node.test.ts
git commit -m "feat(agents): add validate node factory"
```

---

## Task 6: Repair Node Factory

**Files:**

- Create: `src/infrastructure/services/agents/feature-agent/nodes/repair.node.ts`
- Test: `tests/unit/infrastructure/services/agents/feature-agent/nodes/repair.node.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/infrastructure/services/agents/feature-agent/nodes/repair.node.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

import { createRepairNode } from '../../../../../../src/infrastructure/services/agents/feature-agent/nodes/repair.node.js';
import type { IAgentExecutor } from '../../../../../../src/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../../../../../../src/infrastructure/services/agents/feature-agent/state.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Fixed the YAML' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

describe('createRepairNode', () => {
  let tempDir: string;
  let specDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-repair-test-'));
    specDir = join(tempDir, 'specs', 'test');
    mkdirSync(specDir, { recursive: true });
  });

  function makeState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
    return {
      featureId: 'feat-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      currentNode: 'test',
      error: null,
      approvalGates: undefined,
      messages: [],
      validationRetries: 1,
      lastValidationTarget: 'spec.yaml',
      lastValidationErrors: ["Missing required field 'name'"],
      ...overrides,
    } as FeatureAgentState;
  }

  it('sends repair prompt to executor with validation errors', async () => {
    writeFileSync(join(specDir, 'spec.yaml'), 'summary: hello\n');
    const executor = createMockExecutor();
    const node = createRepairNode('spec.yaml', executor);

    await node(makeState());

    expect(executor.execute).toHaveBeenCalledTimes(1);
    const [prompt, options] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(prompt).toContain("Missing required field 'name'");
    expect(prompt).toContain('summary: hello');
    expect(prompt).toContain('spec.yaml');
    expect(options.maxTurns).toBe(5);
    expect(options.disableMcp).toBe(true);
  });

  it('handles multi-file repair (array of filenames)', async () => {
    writeFileSync(join(specDir, 'plan.yaml'), 'phases: []\n');
    writeFileSync(join(specDir, 'tasks.yaml'), 'tasks: []\n');
    const executor = createMockExecutor();
    const node = createRepairNode(['plan.yaml', 'tasks.yaml'], executor);

    await node(makeState({ lastValidationTarget: 'plan.yaml,tasks.yaml' }));

    expect(executor.execute).toHaveBeenCalledTimes(1);
    const [prompt] = (executor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(prompt).toContain('plan.yaml');
    expect(prompt).toContain('tasks.yaml');
  });

  it('returns messages about the repair attempt', async () => {
    writeFileSync(join(specDir, 'spec.yaml'), 'bad: yaml\n');
    const executor = createMockExecutor();
    const node = createRepairNode('spec.yaml', executor);

    const result = await node(makeState({ validationRetries: 2 }));
    expect(result.messages?.length).toBeGreaterThan(0);
    expect(result.messages?.[0]).toContain('repair');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/repair.node.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

```typescript
// src/infrastructure/services/agents/feature-agent/nodes/repair.node.ts
import { join } from 'node:path';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../state.js';
import { readSpecFile, createNodeLogger } from './node-helpers.js';

function buildRepairPrompt(filenames: string[], specDir: string, errors: string[]): string {
  const fileContents = filenames
    .map((f) => {
      const content = readSpecFile(specDir, f);
      return `### ${f}\n\n\`\`\`yaml\n${content}\n\`\`\``;
    })
    .join('\n\n');

  const errorList = errors.map((e) => `- ${e}`).join('\n');
  const filePaths = filenames.map((f) => join(specDir, f)).join(', ');

  return `You are fixing malformed YAML file(s). The following file(s) failed validation.

## Validation Errors

${errorList}

## Current File Content

${fileContents}

## Instructions

Fix ONLY the YAML structural and schema issues listed above.
Do NOT change the semantic content — preserve all data, descriptions, and decisions.
Write the corrected file(s) to: ${filePaths}`;
}

/**
 * Factory that creates a repair node for one or more YAML files.
 *
 * Sends broken YAML + validation errors to the executor with constrained
 * options (maxTurns: 5, write-only tools) for a focused repair.
 */
export function createRepairNode(
  filename: string | string[],
  executor: IAgentExecutor
): (state: FeatureAgentState) => Promise<Partial<FeatureAgentState>> {
  const filenames = Array.isArray(filename) ? filename : [filename];
  const log = createNodeLogger(`repair:${filenames.join(',')}`);

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info(`Repair attempt ${state.validationRetries} for ${filenames.join(', ')}`);

    const prompt = buildRepairPrompt(filenames, state.specDir, state.lastValidationErrors);
    const cwd = state.worktreePath || state.repositoryPath;

    await executor.execute(prompt, {
      cwd,
      maxTurns: 5,
      disableMcp: true,
      tools: ['write'],
    });

    log.info('Repair complete, re-validating...');
    return {
      messages: [`[repair:${filenames.join(',')}] Repair attempt ${state.validationRetries}`],
    };
  };
}
```

**Step 4: Run test to verify it passes**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/unit/infrastructure/services/agents/feature-agent/nodes/repair.node.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/nodes/repair.node.ts tests/unit/infrastructure/services/agents/feature-agent/nodes/repair.node.test.ts
git commit -m "feat(agents): add repair node factory"
```

---

## Task 7: Update State Annotation

**Files:**

- Modify: `src/infrastructure/services/agents/feature-agent/state.ts`

**Step 1: Add validation channels to state**

Add three new annotation channels to `FeatureAgentAnnotation` in `state.ts`:

```typescript
// Add after the `messages` annotation:
  validationRetries: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  lastValidationTarget: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => '',
  }),
  lastValidationErrors: Annotation<string[]>({
    reducer: (_prev, next) => next,
    default: () => [],
  }),
```

**Step 2: Run existing tests to verify nothing breaks**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts`
Expected: PASS (new channels have defaults, existing tests don't set them)

**Step 3: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/state.ts
git commit -m "feat(agents): add validation state channels to graph annotation"
```

---

## Task 8: Wire Graph with Validate/Repair Nodes and Conditional Edges

**Files:**

- Modify: `src/infrastructure/services/agents/feature-agent/feature-agent-graph.ts`

**Step 1: Write the routing function test inline with integration tests**

Add a new test to the existing integration test file:

```typescript
// tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts
// Add this test at the end of the describe block:

it('should validate YAML after each producer node and repair on failure', async () => {
  // This test verifies the graph topology includes validation.
  // The mock executor always returns valid results, so validation passes.
  // A separate unit test covers the repair loop.
  const executor = createMockExecutor();
  const checkpointer = createCheckpointer(':memory:');
  const graph = createFeatureAgentGraph(executor, checkpointer);
  const config = { configurable: { thread_id: 'validate-flow-thread' } };

  // Run fully autonomous — all validation should pass
  const result = await graph.invoke(
    {
      featureId: 'feat-validate-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
    },
    config
  );

  // Verify validation nodes ran (check messages)
  const messages = result.messages as string[];
  expect(messages.some((m: string) => m.includes('validate:'))).toBe(true);
  expect(getInterrupts(result)).toHaveLength(0);
});
```

**Step 2: Update the graph factory**

Replace the contents of `feature-agent-graph.ts`:

```typescript
import { StateGraph, START, END, type BaseCheckpointSaver } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';
import { createAnalyzeNode } from './nodes/analyze.node.js';
import { createRequirementsNode } from './nodes/requirements.node.js';
import { createResearchNode } from './nodes/research.node.js';
import { createPlanNode } from './nodes/plan.node.js';
import { createImplementNode } from './nodes/implement.node.js';
import { createValidateNode } from './nodes/validate.node.js';
import { createRepairNode } from './nodes/repair.node.js';
import { validateSpecAnalyze, validateSpecRequirements } from './nodes/schemas/spec.schema.js';
import { validateResearch } from './nodes/schemas/research.schema.js';
import { validatePlan, validateTasks } from './nodes/schemas/plan.schema.js';
import { safeYamlLoad, readSpecFile } from './nodes/node-helpers.js';

// Re-export state types for consumers
export { FeatureAgentAnnotation, type FeatureAgentState } from './state.js';

/**
 * Creates a routing function for conditional edges after validation.
 * Routes to the next node on success, to repair on failure,
 * or throws after max retries.
 */
function routeValidation(successNode: string, repairNode: string) {
  return (state: FeatureAgentState): string => {
    if (state.lastValidationErrors.length === 0) return successNode;
    if (state.validationRetries >= 3) {
      throw new Error(
        `Validation of ${state.lastValidationTarget} failed after 3 repair attempts: ${state.lastValidationErrors.join('; ')}`
      );
    }
    return repairNode;
  };
}

/**
 * Plan schema validator that cross-validates tasks.yaml phaseIds against plan.yaml phases.
 * Reads both files from specDir and validates both.
 */
function createPlanTasksValidator(specDir: string) {
  return (planData: unknown) => {
    const planResult = validatePlan(planData);
    if (!planResult.valid) return planResult;

    // Cross-validate tasks.yaml
    const tasksContent = readSpecFile(specDir, 'tasks.yaml');
    if (!tasksContent) {
      return {
        valid: false,
        errors: ['tasks.yaml not found — plan node should produce both files'],
      };
    }
    let tasksData: unknown;
    try {
      tasksData = safeYamlLoad(tasksContent);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { valid: false, errors: [`tasks.yaml parse error: ${msg}`] };
    }

    const phases = (planData as Record<string, unknown>).phases as { id: string }[];
    const phaseIds = phases.map((p) => p.id);
    const tasksResult = validateTasks(tasksData, phaseIds);

    return {
      valid: tasksResult.valid,
      errors: [...tasksResult.errors],
    };
  };
}

/**
 * Factory function that creates and compiles the feature-agent LangGraph.
 *
 * The graph defines an SDLC workflow with validation loops:
 *   analyze → validate → requirements → validate → research → validate → plan → validate → implement
 *
 * Each validation step checks YAML parse + schema. On failure, a repair node
 * sends the broken YAML to the executor, then loops back to validate (max 3 retries).
 */
export function createFeatureAgentGraph(
  executor: IAgentExecutor,
  checkpointer?: BaseCheckpointSaver
) {
  const graph = new StateGraph(FeatureAgentAnnotation)
    // --- Producer nodes ---
    .addNode('analyze', createAnalyzeNode(executor))
    .addNode('requirements', createRequirementsNode(executor))
    .addNode('research', createResearchNode(executor))
    .addNode('plan', createPlanNode(executor))
    .addNode('implement', createImplementNode(executor))
    // --- Validate nodes ---
    .addNode('validate_spec_analyze', createValidateNode('spec.yaml', validateSpecAnalyze))
    .addNode(
      'validate_spec_requirements',
      createValidateNode('spec.yaml', validateSpecRequirements)
    )
    .addNode('validate_research', createValidateNode('research.yaml', validateResearch))
    .addNode('validate_plan', (state: FeatureAgentState) => {
      const validator = createPlanTasksValidator(state.specDir);
      const node = createValidateNode('plan.yaml', validator);
      return node(state);
    })
    // --- Repair nodes ---
    .addNode('repair_spec_analyze', createRepairNode('spec.yaml', executor))
    .addNode('repair_spec_requirements', createRepairNode('spec.yaml', executor))
    .addNode('repair_research', createRepairNode('research.yaml', executor))
    .addNode('repair_plan', createRepairNode(['plan.yaml', 'tasks.yaml'], executor))
    // --- Edges: linear flow with validation loops ---
    .addEdge(START, 'analyze')
    .addEdge('analyze', 'validate_spec_analyze')
    .addConditionalEdges(
      'validate_spec_analyze',
      routeValidation('requirements', 'repair_spec_analyze')
    )
    .addEdge('repair_spec_analyze', 'validate_spec_analyze')
    .addEdge('requirements', 'validate_spec_requirements')
    .addConditionalEdges(
      'validate_spec_requirements',
      routeValidation('research', 'repair_spec_requirements')
    )
    .addEdge('repair_spec_requirements', 'validate_spec_requirements')
    .addEdge('research', 'validate_research')
    .addConditionalEdges('validate_research', routeValidation('plan', 'repair_research'))
    .addEdge('repair_research', 'validate_research')
    .addEdge('plan', 'validate_plan')
    .addConditionalEdges('validate_plan', routeValidation('implement', 'repair_plan'))
    .addEdge('repair_plan', 'validate_plan')
    .addEdge('implement', END);

  return graph.compile({ checkpointer });
}
```

**Step 3: Run integration tests**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts`
Expected: PASS — all existing tests pass (validation passes on mock executor output), new test passes

**Step 4: Commit**

```bash
git add src/infrastructure/services/agents/feature-agent/feature-agent-graph.ts tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts
git commit -m "feat(agents): wire validate/repair nodes into graph with conditional edges"
```

---

## Task 9: Integration Test — Validate-Repair Loop

**Files:**

- Modify: `tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts`

**Step 1: Add test for the repair loop**

```typescript
it('should repair YAML when validation fails and retry', async () => {
  // Write intentionally invalid spec.yaml (missing required fields)
  writeFileSync(join(specDir, 'spec.yaml'), 'broken: true\n');

  const executor = createMockExecutor();
  let callCount = 0;

  // First call (analyze): writes broken YAML
  // Repair call: "fixes" the YAML by writing a valid one
  (executor.execute as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    callCount++;
    if (callCount === 1) {
      // Analyze node runs — writes spec.yaml (broken)
      writeFileSync(join(specDir, 'spec.yaml'), 'broken: true\n');
      return { result: 'Analyzed' };
    }
    if (callCount === 2) {
      // Repair node — fixes the YAML
      writeFileSync(
        join(specDir, 'spec.yaml'),
        [
          'name: test',
          'oneLiner: test feature',
          'summary: A test',
          'phase: Analysis',
          'sizeEstimate: S',
          'technologies:',
          '  - TypeScript',
          'content: |',
          '  ## Problem Statement',
          '  Content here',
        ].join('\n') + '\n'
      );
      return { result: 'Fixed YAML' };
    }
    // All subsequent calls succeed normally
    return { result: 'Mock response' };
  });

  const checkpointer = createCheckpointer(':memory:');
  const graph = createFeatureAgentGraph(executor, checkpointer);
  const config = { configurable: { thread_id: 'repair-loop-thread' } };

  const result = await graph.invoke(
    {
      featureId: 'feat-repair-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
    },
    config
  );

  // Graph should have completed (executor called for analyze, repair, then remaining nodes)
  expect(callCount).toBeGreaterThan(2);
  const messages = result.messages as string[];
  expect(messages.some((m: string) => m.includes('repair:'))).toBe(true);
  expect(messages.some((m: string) => m.includes('PASS'))).toBe(true);
});
```

**Step 2: Run integration tests**

Run: `source ~/.nvm/nvm.sh && pnpm test:single tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts`
Expected: PASS

**Step 3: Commit**

```bash
git add tests/integration/infrastructure/services/agents/hitl-approval-flow.test.ts
git commit -m "test(agents): add integration test for validate-repair loop"
```

---

## Task 10: Run Full Test Suite and Fix Issues

**Step 1: Run all tests**

Run: `source ~/.nvm/nvm.sh && pnpm test`
Expected: All tests pass

**Step 2: Run typecheck**

Run: `source ~/.nvm/nvm.sh && pnpm typecheck`
Expected: No type errors

**Step 3: Run lint**

Run: `source ~/.nvm/nvm.sh && pnpm lint`
Expected: No lint errors (run `pnpm lint:fix` if needed)

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(agents): address test/lint/type issues from YAML validation"
```

import { describe, it, expect } from 'vitest';
import {
  validatePlan,
  validateTasks,
} from '../../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/schemas/plan.schema.js';

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

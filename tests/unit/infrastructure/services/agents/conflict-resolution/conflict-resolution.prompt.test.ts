import { describe, it, expect } from 'vitest';
import {
  buildConflictResolutionPrompt,
  type ConflictResolutionPromptParams,
} from '@/infrastructure/services/agents/conflict-resolution/conflict-resolution.prompt.js';

function makeParams(
  overrides?: Partial<ConflictResolutionPromptParams>
): ConflictResolutionPromptParams {
  return {
    conflictedFiles: [
      {
        path: 'src/index.ts',
        content: '<<<<<<< HEAD\nbase code\n=======\nfeature code\n>>>>>>> feat/my-feature',
      },
    ],
    featureBranch: 'feat/my-feature',
    baseBranch: 'main',
    attemptNumber: 1,
    maxAttempts: 3,
    ...overrides,
  };
}

describe('buildConflictResolutionPrompt', () => {
  it('should include all conflicted file paths', () => {
    const params = makeParams({
      conflictedFiles: [
        { path: 'src/index.ts', content: 'conflict content 1' },
        { path: 'src/utils.ts', content: 'conflict content 2' },
        { path: 'tests/foo.test.ts', content: 'conflict content 3' },
      ],
    });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('`src/index.ts`');
    expect(prompt).toContain('`src/utils.ts`');
    expect(prompt).toContain('`tests/foo.test.ts`');
  });

  it('should include conflicted file contents', () => {
    const params = makeParams({
      conflictedFiles: [
        {
          path: 'src/index.ts',
          content: '<<<<<<< HEAD\nbase line\n=======\nfeature line\n>>>>>>> feat/x',
        },
      ],
    });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('<<<<<<< HEAD');
    expect(prompt).toContain('base line');
    expect(prompt).toContain('feature line');
  });

  it('should include feature branch name', () => {
    const params = makeParams({ featureBranch: 'feat/awesome-feature' });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('`feat/awesome-feature`');
  });

  it('should include base branch name', () => {
    const params = makeParams({ baseBranch: 'develop' });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('`develop`');
  });

  it('should include conflict marker removal instructions', () => {
    const prompt = buildConflictResolutionPrompt(makeParams());

    expect(prompt).toContain('`<<<<<<<`');
    expect(prompt).toContain('`=======`');
    expect(prompt).toContain('`>>>>>>>`');
    expect(prompt).toContain('Remove ALL conflict markers');
  });

  it('should warn against modifying non-conflicted files', () => {
    const prompt = buildConflictResolutionPrompt(makeParams());

    expect(prompt).toContain('Edit ONLY the conflicted files listed above');
    expect(prompt).toContain('do NOT modify any other files');
  });

  it('should include attempt number and max attempts', () => {
    const params = makeParams({ attemptNumber: 2, maxAttempts: 3 });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('attempt 2/3');
  });

  it('should include previous feedback when provided', () => {
    const params = makeParams({
      attemptNumber: 2,
      previousFeedback: 'Conflict markers remain in src/index.ts lines 10-15',
    });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).toContain('Previous Attempt Feedback');
    expect(prompt).toContain('Conflict markers remain in src/index.ts lines 10-15');
  });

  it('should not include feedback section on first attempt', () => {
    const params = makeParams({ attemptNumber: 1 });

    const prompt = buildConflictResolutionPrompt(params);

    expect(prompt).not.toContain('Previous Attempt Feedback');
  });

  it('should instruct not to run git commands', () => {
    const prompt = buildConflictResolutionPrompt(makeParams());

    expect(prompt).toContain('Do NOT run git commands');
  });
});

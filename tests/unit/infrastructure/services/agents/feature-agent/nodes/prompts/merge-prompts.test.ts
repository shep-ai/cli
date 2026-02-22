import { describe, it, expect, vi } from 'vitest';

// Mock readSpecFile from node-helpers
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\nsummary: A test feature\n'),
}));

import {
  buildCommitPushPrPrompt,
  buildMergeSquashPrompt,
} from '@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs',
    currentNode: 'merge',
    error: null,
    messages: [],
    approvalGates: undefined,
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    ...overrides,
  } as FeatureAgentState;
}

describe('buildCommitPushPrPrompt', () => {
  it('should always include commit instructions', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: false, openPr: false }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('commit');
    // Should include conventional commit guidance
    expect(prompt.toLowerCase()).toMatch(/conventional commit/i);
  });

  it('should include push instructions when push=true', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: true, openPr: false }),
      'feat/test',
      'main'
    );
    expect(prompt.toLowerCase()).toContain('push');
  });

  it('should include push instructions when openPr=true (implied push)', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: false, openPr: true }),
      'feat/test',
      'main'
    );
    expect(prompt.toLowerCase()).toContain('push');
  });

  it('should include PR creation instructions when openPr=true', () => {
    const prompt = buildCommitPushPrPrompt(baseState({ openPr: true }), 'feat/test', 'main');
    expect(prompt.toLowerCase()).toContain('pull request');
    expect(prompt).toContain('gh pr create');
  });

  it('should NOT include push instructions when push=false and openPr=false', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: false, openPr: false }),
      'feat/test',
      'main'
    );
    // Should explicitly say commit only, or not include push step
    expect(prompt).not.toContain('git push');
    expect(prompt).not.toContain('gh pr create');
  });

  it('should NOT include PR instructions when openPr=false', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: true, openPr: false }),
      'feat/test',
      'main'
    );
    expect(prompt).not.toContain('gh pr create');
  });

  it('should include spec context', () => {
    const prompt = buildCommitPushPrPrompt(baseState(), 'feat/test', 'main');
    // readSpecFile is mocked to return 'name: Test Feature...'
    expect(prompt).toContain('Test Feature');
  });

  it('should include branch names', () => {
    const prompt = buildCommitPushPrPrompt(baseState(), 'feat/my-branch', 'main');
    expect(prompt).toContain('feat/my-branch');
    expect(prompt).toContain('main');
  });

  it('should instruct agent to write commit message from diff', () => {
    const prompt = buildCommitPushPrPrompt(baseState(), 'feat/test', 'main');
    expect(prompt.toLowerCase()).toMatch(/diff|changes/);
  });

  it('should instruct agent to update feature.yaml prUrl when openPr=true', () => {
    const prompt = buildCommitPushPrPrompt(baseState({ openPr: true }), 'feat/test', 'main');
    expect(prompt).toContain('feature.yaml');
    expect(prompt.toLowerCase()).toContain('prurl');
  });

  it('should be deterministic (same input = same output)', () => {
    const state = baseState({ push: true, openPr: true });
    const prompt1 = buildCommitPushPrPrompt(state, 'feat/test', 'main');
    const prompt2 = buildCommitPushPrPrompt(state, 'feat/test', 'main');
    expect(prompt1).toBe(prompt2);
  });
});

describe('buildMergeSquashPrompt', () => {
  it('should include PR number and URL when provided', () => {
    const prompt = buildMergeSquashPrompt(
      baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('42');
    expect(prompt).toContain('https://github.com/test/repo/pull/42');
  });

  it('should include merge strategy instruction', () => {
    const prompt = buildMergeSquashPrompt(baseState(), 'feat/test', 'main');
    expect(prompt.toLowerCase()).toMatch(/merge|squash/);
  });

  it('should instruct agent to resolve conflicts if encountered', () => {
    const prompt = buildMergeSquashPrompt(baseState(), 'feat/test', 'main');
    expect(prompt.toLowerCase()).toContain('conflict');
  });

  it('should include branch names', () => {
    const prompt = buildMergeSquashPrompt(baseState(), 'feat/my-branch', 'main');
    expect(prompt).toContain('feat/my-branch');
    expect(prompt).toContain('main');
  });

  it('should handle merge when no PR exists (direct branch merge)', () => {
    const prompt = buildMergeSquashPrompt(
      baseState({ prUrl: null, prNumber: null }),
      'feat/test',
      'main'
    );
    // Should still include merge instructions for direct branch merge
    expect(prompt.toLowerCase()).toContain('merge');
  });

  it('should be deterministic', () => {
    const state = baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 });
    const prompt1 = buildMergeSquashPrompt(state, 'feat/test', 'main');
    const prompt2 = buildMergeSquashPrompt(state, 'feat/test', 'main');
    expect(prompt1).toBe(prompt2);
  });
});

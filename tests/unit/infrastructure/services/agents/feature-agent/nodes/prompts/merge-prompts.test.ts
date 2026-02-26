import { describe, it, expect, vi } from 'vitest';

// Mock readSpecFile from node-helpers
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\nsummary: A test feature\n'),
}));

import {
  buildCommitPushPrPrompt,
  buildMergeSquashPrompt,
} from '@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js';
import { readSpecFile } from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
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

  it('should forbid git pull and rebase before pushing', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ push: true, openPr: false }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('Do NOT run `git pull`');
    expect(prompt).toContain('git rebase');
    expect(prompt).toContain('git merge');
  });

  it('should be deterministic (same input = same output)', () => {
    const state = baseState({ push: true, openPr: true });
    const prompt1 = buildCommitPushPrPrompt(state, 'feat/test', 'main');
    const prompt2 = buildCommitPushPrPrompt(state, 'feat/test', 'main');
    expect(prompt1).toBe(prompt2);
  });

  it('should forbid source code modification when no rejection feedback', () => {
    const prompt = buildCommitPushPrPrompt(baseState(), 'feat/test', 'main');
    expect(prompt).toContain('Do NOT modify any source code files');
    expect(prompt).not.toContain('MUST modify source code');
  });

  it('should instruct agent to modify source code when rejection feedback exists', () => {
    const specWithRejection = [
      'name: Test Feature',
      'rejectionFeedback:',
      '  - iteration: 1',
      '    message: rename the phase name',
      '    phase: merge',
      '    timestamp: "2026-01-01T00:00:00Z"',
    ].join('\n');
    vi.mocked(readSpecFile).mockReturnValueOnce(specWithRejection);
    const prompt = buildCommitPushPrPrompt(baseState(), 'feat/test', 'main');
    expect(prompt).toContain('MUST modify source code');
    expect(prompt).not.toContain('Do NOT modify any source code files');
    expect(prompt).toContain('rename the phase name');
  });
});

describe('buildMergeSquashPrompt', () => {
  describe('PR path (remote merge)', () => {
    it('should include PR number and URL when provided', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('42');
      expect(prompt).toContain('https://github.com/test/repo/pull/42');
    });

    it('should use gh pr merge for remote merge', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('gh pr merge');
    });

    it('should NOT reference worktree or repositoryPath for PR merge', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 }),
        'feat/test',
        'main'
      );
      expect(prompt).not.toContain('/tmp/worktree');
      expect(prompt).not.toContain('/tmp/repo');
    });
  });

  describe('non-PR path (local merge)', () => {
    it('should use repositoryPath (original repo), NOT worktreePath', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('/tmp/repo');
      expect(prompt).not.toContain('/tmp/worktree');
    });

    it('should include git merge --squash instructions', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('git merge --squash');
    });

    it('should instruct agent to checkout base branch first', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('git checkout main');
    });

    it('should instruct to cd to original repo', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('cd /tmp/repo');
    });

    it('should include fetch/pull from origin when hasRemote=true', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main',
        true
      );
      expect(prompt).toContain('git fetch origin');
      expect(prompt).toContain('git pull origin');
    });

    it('should NOT include fetch/pull from origin when hasRemote=false', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main',
        false
      );
      expect(prompt).not.toContain('git fetch origin');
      expect(prompt).not.toContain('git pull origin');
    });

    it('should NOT include fetch/pull when hasRemote defaults to false', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).not.toContain('git fetch origin');
      expect(prompt).not.toContain('git pull origin');
    });

    it('should include worktree protection constraints', () => {
      const prompt = buildMergeSquashPrompt(
        baseState({ prUrl: null, prNumber: null }),
        'feat/test',
        'main'
      );
      expect(prompt).toContain('NEVER remove');
      expect(prompt).toContain('worktree');
      expect(prompt).not.toContain('git checkout feat/test');
    });

    it('should include branch names', () => {
      const prompt = buildMergeSquashPrompt(baseState(), 'feat/my-branch', 'main');
      expect(prompt).toContain('feat/my-branch');
      expect(prompt).toContain('main');
    });

    it('should instruct agent to resolve conflicts if encountered', () => {
      const prompt = buildMergeSquashPrompt(baseState(), 'feat/test', 'main');
      expect(prompt.toLowerCase()).toContain('conflict');
    });
  });

  it('should be deterministic', () => {
    const state = baseState({ prUrl: 'https://github.com/test/repo/pull/42', prNumber: 42 });
    const prompt1 = buildMergeSquashPrompt(state, 'feat/test', 'main');
    const prompt2 = buildMergeSquashPrompt(state, 'feat/test', 'main');
    expect(prompt1).toBe(prompt2);
  });
});

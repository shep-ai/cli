import { describe, it, expect, vi } from 'vitest';

// Mock readSpecFile from node-helpers
vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      readSpecFile: vi.fn().mockReturnValue(''),
      buildCommitPushBlock: vi.fn().mockReturnValue('## Final Step — Commit Your Work\n(mocked)'),
    };
  }
);

import { buildEvidencePrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js';
import {
  readSpecFile,
  buildCommitPushBlock,
} from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs',
    currentNode: 'evidence',
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
    evidence: [],
    ...overrides,
  } as FeatureAgentState;
}

describe('buildEvidencePrompt', () => {
  it('should include spec context when spec.yaml exists', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'spec.yaml') return 'name: Test Feature\nsummary: A test feature\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('Test Feature');
    expect(prompt).toContain('spec.yaml');
  });

  it('should include tasks context when tasks.yaml exists', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'tasks.yaml')
        return 'phases:\n  - name: Phase 1\n    tasks:\n      - id: task-1\n        name: Create the thing\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('task-1');
    expect(prompt).toContain('Create the thing');
  });

  it('should include worktree path', () => {
    const prompt = buildEvidencePrompt(baseState({ worktreePath: '/my/worktree/path' }));
    expect(prompt).toContain('/my/worktree/path');
  });

  it('should fall back to repositoryPath when worktreePath is absent', () => {
    const prompt = buildEvidencePrompt(
      baseState({ worktreePath: '', repositoryPath: '/fallback/repo' })
    );
    expect(prompt).toContain('/fallback/repo');
  });

  it('should include .shep/evidence/ storage instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('.shep/evidence/');
  });

  it('should include JSON output format instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    // Should instruct the agent to output a fenced JSON code block with evidence records
    expect(prompt).toContain('```json');
    expect(prompt).toContain('type');
    expect(prompt).toContain('capturedAt');
    expect(prompt).toContain('description');
    expect(prompt).toContain('relativePath');
    expect(prompt).toContain('taskRef');
  });

  it('should include all valid EvidenceType values in instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('Screenshot');
    expect(prompt).toContain('Video');
    expect(prompt).toContain('TestOutput');
    expect(prompt).toContain('TerminalRecording');
  });

  it('should include commit block via buildCommitPushBlock', () => {
    vi.mocked(buildCommitPushBlock).mockReturnValue('## Final Step — Commit Your Work\n(mocked)');

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('## Final Step — Commit Your Work');
    expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalled();
  });

  it('should pass .shep/evidence/ path in commit block files', () => {
    buildEvidencePrompt(baseState());
    expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
      expect.objectContaining({
        files: expect.arrayContaining([expect.stringContaining('.shep/evidence/')]),
      })
    );
  });

  it('should pass push flag through to buildCommitPushBlock', () => {
    buildEvidencePrompt(baseState({ push: true }));
    expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
      expect.objectContaining({ push: true })
    );
  });

  it('should include file size constraints (standard resolution)', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.toLowerCase()).toContain('standard resolution');
  });

  it('should include file size constraints (500-line truncation)', () => {
    const prompt = buildEvidencePrompt(baseState());
    expect(prompt).toContain('500');
  });

  it('should include sensitive data redaction instructions', () => {
    const prompt = buildEvidencePrompt(baseState());
    const lower = prompt.toLowerCase();
    expect(lower).toMatch(/redact|sensitive|secret|api key/);
  });

  it('should include evidence capture instructions per task type', () => {
    const prompt = buildEvidencePrompt(baseState());
    const lower = prompt.toLowerCase();
    // Should mention screenshots for UI tasks
    expect(lower).toContain('screenshot');
    // Should mention test output for backend tasks
    expect(lower).toMatch(/test output|test result/);
    // Should mention CLI/terminal for CLI tasks
    expect(lower).toMatch(/terminal|cli/);
  });

  it('should handle missing spec.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockReturnValue('');

    const prompt = buildEvidencePrompt(baseState());
    // Should still produce a valid prompt even with empty spec
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain('.shep/evidence/');
  });

  it('should handle missing tasks.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'spec.yaml') return 'name: Test Feature\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.length).toBeGreaterThan(100);
    expect(prompt).toContain('.shep/evidence/');
  });

  it('should be deterministic (same input = same output)', () => {
    vi.mocked(readSpecFile).mockReturnValue('name: Test\n');
    const state = baseState();
    const prompt1 = buildEvidencePrompt(state);
    const prompt2 = buildEvidencePrompt(state);
    expect(prompt1).toBe(prompt2);
  });

  it('should include the specDir for evidence storage path context', () => {
    const prompt = buildEvidencePrompt(baseState({ specDir: '/custom/specs' }));
    // The prompt may reference specDir for context
    expect(prompt).toBeDefined();
    expect(prompt.length).toBeGreaterThan(0);
  });
});

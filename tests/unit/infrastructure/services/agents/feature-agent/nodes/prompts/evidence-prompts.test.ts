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

import {
  buildEvidencePrompt,
  buildEvidenceRetryPrompt,
} from '@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js';
import {
  readSpecFile,
  buildCommitPushBlock,
} from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { ValidationError } from '@/infrastructure/services/agents/feature-agent/nodes/evidence-output-parser.js';

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-test',
    specDir: '/home/user/.shep/repos/abc123/wt/feat-test/specs/057-test-feature',
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
    const prompt = buildEvidencePrompt(
      baseState({ worktreePath: '/home/user/.shep/repos/abc123/wt/my-feature' })
    );
    expect(prompt).toContain('/home/user/.shep/repos/abc123/wt/my-feature');
  });

  it('should fall back to repositoryPath when worktreePath is absent', () => {
    const prompt = buildEvidencePrompt(
      baseState({
        worktreePath: '',
        repositoryPath: '/home/user/.shep/repos/abc123/wt/fallback',
      })
    );
    expect(prompt).toContain('/home/user/.shep/repos/abc123/wt/fallback');
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
    expect(lower).toContain('screenshot');
    expect(lower).toMatch(/test output|test result/);
    expect(lower).toMatch(/terminal|cli/);
  });

  it('should handle missing spec.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockReturnValue('');

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should handle missing tasks.yaml gracefully', () => {
    vi.mocked(readSpecFile).mockImplementation((_, filename) => {
      if (filename === 'spec.yaml') return 'name: Test Feature\n';
      return '';
    });

    const prompt = buildEvidencePrompt(baseState());
    expect(prompt.length).toBeGreaterThan(100);
  });

  it('should be deterministic (same input = same output)', () => {
    vi.mocked(readSpecFile).mockReturnValue('name: Test\n');
    const state = baseState();
    const prompt1 = buildEvidencePrompt(state);
    const prompt2 = buildEvidencePrompt(state);
    expect(prompt1).toBe(prompt2);
  });

  describe('commitEvidence=false (default)', () => {
    it('should store evidence in shep home folder by default', () => {
      const prompt = buildEvidencePrompt(baseState());
      // Should reference the shep home evidence directory (derived from worktree path)
      expect(prompt).toContain('evidence');
      expect(prompt).toContain('shep home');
    });

    it('should NOT include commit/push block', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('Do NOT commit or push');
      expect(vi.mocked(buildCommitPushBlock)).not.toHaveBeenCalled();
    });

    it('should instruct NOT to commit files', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: false });
      expect(prompt).toContain('Do NOT commit or push');
    });
  });

  describe('mandatory screenshot rule', () => {
    it('should require screenshots for UI changes', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('MANDATORY Screenshot Rule');
      expect(prompt).toContain('you MUST capture at least one Screenshot');
    });

    it('should include Playwright installation instructions', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('npx playwright install chromium');
    });

    it('should include screenshot capture script example', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('page.screenshot');
    });

    it('should state minimum evidence requirements', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).toContain('Minimum Evidence Requirements');
      expect(prompt).toContain('Do NOT output only TestOutput/TerminalRecording');
    });

    it('should not contain "be selective" language', () => {
      const prompt = buildEvidencePrompt(baseState());
      expect(prompt).not.toContain('Be selective');
    });
  });

  describe('shep-managed mode (specDir outside worktree)', () => {
    it('should force commitEvidence=false when specDir is outside worktree', () => {
      // specDir is in ~/.shep/repos/<hash>/specs/ (outside the worktree)
      const state = baseState({
        worktreePath: '/home/user/.shep/repos/abc123/wt/feat-test',
        specDir: '/home/user/.shep/repos/abc123/specs/057-test-feature',
      });

      const prompt = buildEvidencePrompt(state, { commitEvidence: true });

      // Should NOT include commit instructions even though commitEvidence=true
      expect(prompt).toContain('Do NOT commit or push');
      expect(prompt).not.toContain('Spec folder');
    });

    it('should keep commitEvidence=true when specDir is inside worktree (.shep/specs/ path)', () => {
      // In-repo mode: specDir is inside the worktree under .shep/specs/
      const state = baseState({
        worktreePath: '/home/user/.shep/repos/abc123/wt/feat-test',
        specDir: '/home/user/.shep/repos/abc123/wt/feat-test/.shep/specs/057-test-feature',
      });

      const prompt = buildEvidencePrompt(state, { commitEvidence: true });

      // Should include commit instructions since specDir is inside the worktree
      expect(prompt).toContain('Spec folder');
      expect(prompt).not.toContain('Do NOT commit or push');
    });

    it('should keep commitEvidence behavior unchanged when specDir is inside worktree (legacy specs/ path)', () => {
      // Legacy path: specDir is inside the worktree under specs/
      const state = baseState({
        worktreePath: '/home/user/.shep/repos/abc123/wt/feat-test',
        specDir: '/home/user/.shep/repos/abc123/wt/feat-test/specs/057-test-feature',
      });

      const prompt = buildEvidencePrompt(state, { commitEvidence: true });

      expect(prompt).toContain('Spec folder');
    });
  });

  describe('commitEvidence=true', () => {
    it('should include spec evidence folder storage instructions', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('specs/057-test-feature/evidence');
    });

    it('should include commit block via buildCommitPushBlock', () => {
      vi.mocked(buildCommitPushBlock).mockReturnValue('## Final Step — Commit Your Work\n(mocked)');

      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('## Final Step — Commit Your Work');
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalled();
    });

    it('should pass spec evidence path in commit block files', () => {
      buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
        expect.objectContaining({
          files: expect.arrayContaining([
            expect.stringContaining('specs/057-test-feature/evidence/'),
          ]),
        })
      );
    });

    it('should pass push flag through to buildCommitPushBlock', () => {
      buildEvidencePrompt(baseState({ push: true }), { commitEvidence: true });
      expect(vi.mocked(buildCommitPushBlock)).toHaveBeenCalledWith(
        expect.objectContaining({ push: true })
      );
    });

    it('should mention PR body in the prompt', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('pull request body');
    });

    it('should save to BOTH locations', () => {
      const prompt = buildEvidencePrompt(baseState(), { commitEvidence: true });
      expect(prompt).toContain('Shep home folder');
      expect(prompt).toContain('Spec folder');
    });
  });
});

describe('buildEvidenceRetryPrompt', () => {
  it('should include base evidence prompt content', () => {
    const errors: ValidationError[] = [
      {
        type: 'ui',
        taskId: 'task-1',
        taskTitle: 'Add toggle',
        message: 'Missing app-level screenshot',
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    // The base prompt always contains the "EVIDENCE COLLECTION" phrase
    expect(prompt).toContain('EVIDENCE COLLECTION');
  });

  it('should include VALIDATION FEEDBACK section header', () => {
    const errors: ValidationError[] = [
      {
        type: 'ui',
        taskId: 'task-1',
        taskTitle: 'Add toggle',
        message: 'Missing app-level screenshot',
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    expect(prompt).toContain('VALIDATION FEEDBACK');
  });

  it('should format UI validation errors with task details', () => {
    const errors: ValidationError[] = [
      {
        type: 'ui',
        taskId: 'task-3',
        taskTitle: 'Add toggle component',
        message:
          "Missing app-level screenshot for task-3 (UI task 'Add toggle component'). Storybook-only screenshots are insufficient.",
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    expect(prompt).toContain('task-3');
    expect(prompt).toContain('Add toggle component');
    expect(prompt).toContain('app-level screenshot');
  });

  it('should format completeness errors with task list', () => {
    const errors: ValidationError[] = [
      {
        type: 'completeness',
        taskId: 'task-5',
        taskTitle: 'Add API endpoint tests',
        message:
          "No TestOutput evidence for task-5 (test task 'Add API endpoint tests'). Test results are required.",
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    expect(prompt).toContain('task-5');
    expect(prompt).toContain('Add API endpoint tests');
    expect(prompt).toContain('TestOutput');
  });

  it('should format file existence errors with paths', () => {
    const errors: ValidationError[] = [
      {
        type: 'fileExistence',
        message:
          'Evidence file not found: specs/071-evidence/app-screenshot.png (Homepage screenshot)',
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    expect(prompt).toContain('Evidence file not found');
    expect(prompt).toContain('specs/071-evidence/app-screenshot.png');
  });

  it('should include all error types when mixed errors are provided', () => {
    const errors: ValidationError[] = [
      {
        type: 'ui',
        taskId: 'task-1',
        taskTitle: 'Add toggle',
        message: "Missing app-level screenshot for task-1 (UI task 'Add toggle')",
      },
      {
        type: 'completeness',
        taskId: 'task-5',
        taskTitle: 'Add API tests',
        message: "No TestOutput evidence for task-5 (test task 'Add API tests')",
      },
      {
        type: 'fileExistence',
        message: 'Evidence file not found: evidence/screenshot.png (broken ref)',
      },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    // All three types should be present
    expect(prompt).toContain('task-1');
    expect(prompt).toContain('Add toggle');
    expect(prompt).toContain('task-5');
    expect(prompt).toContain('Add API tests');
    expect(prompt).toContain('evidence/screenshot.png');
  });

  it('should instruct the agent to focus on fixing gaps, not recollecting everything', () => {
    const errors: ValidationError[] = [
      { type: 'ui', taskId: 'task-1', taskTitle: 'Add toggle', message: 'Missing screenshot' },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors);
    // Should contain instruction to focus on gaps
    const lower = prompt.toLowerCase();
    expect(lower).toMatch(/focus.*gap|fix.*listed|address.*missing|focus.*missing/);
  });

  it('should accept EvidencePromptOptions and forward them to buildEvidencePrompt', () => {
    const errors: ValidationError[] = [
      { type: 'ui', taskId: 'task-1', taskTitle: 'Test', message: 'Missing screenshot' },
    ];
    const prompt = buildEvidenceRetryPrompt(baseState(), errors, { commitEvidence: true });
    // When commitEvidence is true, the base prompt mentions "Spec folder"
    expect(prompt).toContain('Spec folder');
  });

  it('should return base prompt when errors array is empty', () => {
    const prompt = buildEvidenceRetryPrompt(baseState(), []);
    // With no errors, should still include base prompt
    expect(prompt).toContain('EVIDENCE COLLECTION');
    // Should NOT include feedback section when there are no errors
    expect(prompt).not.toContain('VALIDATION FEEDBACK');
  });
});

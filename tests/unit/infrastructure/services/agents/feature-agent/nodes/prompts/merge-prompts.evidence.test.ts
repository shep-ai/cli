import { describe, it, expect, vi } from 'vitest';
import { EvidenceType, type Evidence } from '@/domain/generated/output.js';

// Mock readSpecFile from node-helpers
vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      readSpecFile: vi.fn().mockReturnValue('name: Test Feature\nsummary: A test feature\n'),
    };
  }
);

import { buildCommitPushPrPrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js';
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
    evidence: [],
    ...overrides,
  } as FeatureAgentState;
}

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    type: EvidenceType.Screenshot,
    capturedAt: '2026-03-09T12:00:00Z',
    description: 'Screenshot of dashboard page',
    relativePath: '.shep/evidence/dashboard.png',
    ...overrides,
  };
}

describe('buildCommitPushPrPrompt — evidence rendering', () => {
  it('should include an evidence section when state.evidence is non-empty', () => {
    const evidence = [makeEvidence()];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('## Evidence');
  });

  it('should NOT include an evidence section when state.evidence is empty', () => {
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence: [] }),
      'feat/test',
      'main'
    );
    expect(prompt).not.toContain('## Evidence');
  });

  it('should render screenshot evidence as inline image markdown', () => {
    const evidence = [
      makeEvidence({
        type: EvidenceType.Screenshot,
        description: 'Login page screenshot',
        relativePath: '.shep/evidence/login.png',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('![Login page screenshot](.shep/evidence/login.png)');
  });

  it('should render video evidence as a markdown link', () => {
    const evidence = [
      makeEvidence({
        type: EvidenceType.Video,
        description: 'Workflow demo recording',
        relativePath: '.shep/evidence/demo.mp4',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('[Workflow demo recording](.shep/evidence/demo.mp4)');
    // Should NOT use image syntax for videos
    expect(prompt).not.toContain('![Workflow demo recording]');
  });

  it('should render test output evidence as a fenced code block with description', () => {
    const evidence = [
      makeEvidence({
        type: EvidenceType.TestOutput,
        description: 'Unit test results',
        relativePath: '.shep/evidence/test-output.txt',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('Unit test results');
    // Should reference the file path in a code-friendly way
    expect(prompt).toContain('.shep/evidence/test-output.txt');
  });

  it('should render terminal recording evidence as a markdown link', () => {
    const evidence = [
      makeEvidence({
        type: EvidenceType.TerminalRecording,
        description: 'CLI session recording',
        relativePath: '.shep/evidence/session.cast',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('[CLI session recording](.shep/evidence/session.cast)');
    // Should NOT use image syntax for terminal recordings
    expect(prompt).not.toContain('![CLI session recording]');
  });

  it('should render multiple evidence items in order', () => {
    const evidence = [
      makeEvidence({
        type: EvidenceType.Screenshot,
        description: 'First screenshot',
        relativePath: '.shep/evidence/first.png',
      }),
      makeEvidence({
        type: EvidenceType.TestOutput,
        description: 'Test results',
        relativePath: '.shep/evidence/tests.txt',
      }),
      makeEvidence({
        type: EvidenceType.Video,
        description: 'Demo video',
        relativePath: '.shep/evidence/demo.mp4',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );

    const firstIdx = prompt.indexOf('First screenshot');
    const secondIdx = prompt.indexOf('Test results');
    const thirdIdx = prompt.indexOf('Demo video');

    expect(firstIdx).toBeGreaterThan(-1);
    expect(secondIdx).toBeGreaterThan(-1);
    expect(thirdIdx).toBeGreaterThan(-1);
    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });

  it('should include taskRef when present on evidence', () => {
    const evidence = [
      makeEvidence({
        description: 'Dashboard screenshot',
        taskRef: 'task-3',
      }),
    ];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: true, evidence }),
      'feat/test',
      'main'
    );
    expect(prompt).toContain('task-3');
  });

  it('should include evidence section even when openPr is false (commit-only mode)', () => {
    const evidence = [makeEvidence()];
    const prompt = buildCommitPushPrPrompt(
      baseState({ openPr: false, push: false, evidence }),
      'feat/test',
      'main'
    );
    // Evidence section should still be present in the prompt so the agent
    // knows about evidence, even if no PR is being created
    expect(prompt).toContain('## Evidence');
  });
});

/**
 * Tests that all spec-phase prompts respect the commitSpecs flag.
 *
 * When commitSpecs=false, prompts must NOT include commit/push instructions
 * and must instead instruct the agent to skip committing spec files.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock(
  '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  async (importOriginal) => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return {
      ...actual,
      readSpecFile: vi.fn().mockReturnValue('name: test\nsummary: hello\n'),
    };
  }
);

import { buildAnalyzePrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/analyze.prompt.js';
import { buildRequirementsPrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/requirements.prompt.js';
import { buildResearchPrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/research.prompt.js';
import { buildPlanPrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/plan.prompt.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

function createState(overrides?: Partial<FeatureAgentState>): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/repo',
    specDir: '/tmp/spec',
    messages: [],
    push: false,
    openPr: false,
    commitSpecs: true,
    ...overrides,
  } as FeatureAgentState;
}

const prompts = [
  { name: 'analyze', build: buildAnalyzePrompt },
  { name: 'requirements', build: buildRequirementsPrompt },
  { name: 'research', build: buildResearchPrompt },
  { name: 'plan', build: buildPlanPrompt },
] as const;

describe.each(prompts)('$name prompt — commitSpecs flag', ({ build }) => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include commit block when commitSpecs=true', () => {
    const prompt = build(createState({ commitSpecs: true }));
    expect(prompt).toContain('Commit Your Work');
    expect(prompt).toContain('git add');
  });

  it('should exclude commit block when commitSpecs=false', () => {
    const prompt = build(createState({ commitSpecs: false }));
    expect(prompt).not.toContain('Commit Your Work');
    expect(prompt).not.toContain('git add');
    expect(prompt).toContain('Do NOT commit or push any spec files');
  });
});

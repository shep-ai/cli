/**
 * Requirements Prompt Tests - Structured Options & Rejection Feedback
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock node-helpers readSpecFile
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  readSpecFile: vi.fn(),
}));

import { buildRequirementsPrompt } from '@/infrastructure/services/agents/feature-agent/nodes/prompts/requirements.prompt.js';
import { readSpecFile } from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

const mockReadSpecFile = readSpecFile as ReturnType<typeof vi.fn>;

function createState(overrides?: Partial<FeatureAgentState>): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/repo',
    specDir: '/tmp/spec',
    messages: [],
    push: false,
    openPr: false,
    ...overrides,
  } as FeatureAgentState;
}

describe('buildRequirementsPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should include structured options instruction', () => {
    mockReadSpecFile.mockReturnValue('name: test\nsummary: hello\n');
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).toContain('options:');
    expect(prompt).toContain('selected: true');
    expect(prompt).toContain('selectionRationale');
  });

  it('should include QuestionOption structure example', () => {
    mockReadSpecFile.mockReturnValue('name: test\n');
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).toContain('option:');
    expect(prompt).toContain('description:');
    expect(prompt).toContain('selected:');
  });

  it('should include rejection feedback section when present', () => {
    const specContent = `name: test
rejectionFeedback:
  - iteration: 1
    message: "Please add more detail about API endpoints"
    timestamp: "2026-02-22T12:00:00Z"
`;
    mockReadSpecFile.mockReturnValue(specContent);
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).toContain('Previous Rejection Feedback');
    expect(prompt).toContain('Please add more detail about API endpoints');
    expect(prompt).toContain('Iteration 1');
  });

  it('should NOT include rejection feedback section when absent', () => {
    mockReadSpecFile.mockReturnValue('name: test\nsummary: hello\n');
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).not.toContain('Previous Rejection Feedback');
  });

  it('should handle multiple rejection feedback entries', () => {
    const specContent = `name: test
rejectionFeedback:
  - iteration: 1
    message: "Add error handling"
    timestamp: "2026-02-22T12:00:00Z"
  - iteration: 2
    message: "Also add rate limiting"
    timestamp: "2026-02-22T13:00:00Z"
`;
    mockReadSpecFile.mockReturnValue(specContent);
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).toContain('Iteration 1');
    expect(prompt).toContain('Iteration 2');
    expect(prompt).toContain('Add error handling');
    expect(prompt).toContain('Also add rate limiting');
  });

  it('should instruct exactly one option selected per question', () => {
    mockReadSpecFile.mockReturnValue('name: test\n');
    const prompt = buildRequirementsPrompt(createState());
    expect(prompt).toContain('exactly ONE option');
  });
});

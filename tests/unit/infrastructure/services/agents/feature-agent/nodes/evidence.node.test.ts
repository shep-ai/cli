/**
 * Evidence Node Unit Tests
 *
 * Tests for the evidence collection node that invokes the agent executor
 * to capture screenshots, test outputs, and terminal recordings, then
 * parses Evidence[] from the agent's text output.
 *
 * Covers:
 * - Agent executor call with evidence prompt
 * - Evidence record parsing from agent output
 * - Graceful degradation on parse failure
 * - Resume support via completedPhases
 * - Phase marking on completion
 * - Error handling (re-throw for LangGraph checkpoint/resume)
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

const {
  mockGetCompletedPhases,
  mockMarkPhaseComplete,
  mockRecordPhaseStart,
  mockRecordPhaseEnd,
  mockBuildEvidencePrompt,
  mockParseEvidenceRecords,
  mockValidateUiEvidenceHasAppProof,
  mockIsGraphBubbleUp,
  mockHasSettings,
  mockGetSettings,
} = vi.hoisted(() => ({
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-456'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockBuildEvidencePrompt: vi.fn().mockReturnValue('evidence collection prompt'),
  mockParseEvidenceRecords: vi.fn().mockReturnValue([]),
  mockValidateUiEvidenceHasAppProof: vi.fn().mockReturnValue({
    valid: true,
    hasScreenshots: false,
    hasAppScreenshots: false,
    hasOnlyStorybookScreenshots: false,
    warnings: [],
  }),
  mockIsGraphBubbleUp: vi.fn().mockReturnValue(false),
  mockHasSettings: vi.fn().mockReturnValue(true),
  mockGetSettings: vi.fn().mockReturnValue({ workflow: { commitEvidence: false } }),
}));

// Mock LangGraph
vi.mock('@langchain/langgraph', () => ({
  isGraphBubbleUp: mockIsGraphBubbleUp,
}));

// Mock node-helpers
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({
    activate: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  }),
  getCompletedPhases: mockGetCompletedPhases,
  markPhaseComplete: mockMarkPhaseComplete,
  retryExecute: vi
    .fn()
    .mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) => {
        return executor.execute(prompt);
      }
    ),
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 5000 }),
}));

// Mock heartbeat
vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

// Mock phase timing
vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
}));

// Mock lifecycle context
vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
}));

// Mock evidence prompt builder
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/evidence-prompts.js', () => ({
  buildEvidencePrompt: mockBuildEvidencePrompt,
}));

// Mock evidence output parser
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/evidence-output-parser.js', () => ({
  parseEvidenceRecords: mockParseEvidenceRecords,
  validateUiEvidenceHasAppProof: mockValidateUiEvidenceHasAppProof,
}));

// Mock settings service
vi.mock('@/infrastructure/services/settings.service.js', () => ({
  hasSettings: mockHasSettings,
  getSettings: mockGetSettings,
}));

import { createEvidenceNode } from '@/infrastructure/services/agents/feature-agent/nodes/evidence.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import { EvidenceType, type Evidence } from '@/domain/generated/output.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({
      result: 'Captured evidence:\n```json\n[]\n```',
    }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function baseState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
  return {
    featureId: 'feat-001',
    repositoryPath: '/tmp/repo',
    worktreePath: '/tmp/worktree',
    specDir: '/tmp/specs',
    currentNode: 'implement',
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

const sampleEvidence: Evidence[] = [
  {
    type: EvidenceType.Screenshot,
    capturedAt: '2026-03-09T12:00:00Z',
    description: 'Homepage showing new feature',
    relativePath: '.shep/evidence/homepage.png',
    taskRef: 'task-1',
  },
  {
    type: EvidenceType.TestOutput,
    capturedAt: '2026-03-09T12:01:00Z',
    description: 'Unit tests passing',
    relativePath: '.shep/evidence/test-results.txt',
    taskRef: 'task-2',
  },
];

describe('createEvidenceNode', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = createMockExecutor();
  });

  // --- Agent executor calls ---
  describe('agent executor calls', () => {
    it('should call executor.execute with evidence prompt', async () => {
      const node = createEvidenceNode(executor);
      const state = baseState();
      await node(state);

      expect(mockBuildEvidencePrompt).toHaveBeenCalledWith(state, { commitEvidence: false });
      expect(executor.execute).toHaveBeenCalledWith('evidence collection prompt');
    });

    it('should pass executor options from buildExecutorOptions', async () => {
      const { retryExecute } = await import(
        '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js'
      );
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(retryExecute).toHaveBeenCalledWith(
        executor,
        'evidence collection prompt',
        { cwd: '/tmp/worktree', maxTurns: 5000 },
        expect.objectContaining({ logger: expect.anything() })
      );
    });
  });

  // --- Evidence parsing ---
  describe('evidence parsing', () => {
    it('should parse evidence records from executor result', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce(sampleEvidence);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(mockParseEvidenceRecords).toHaveBeenCalledWith('Captured evidence:\n```json\n[]\n```');
      expect(result.evidence).toEqual(sampleEvidence);
    });

    it('should return evidence array in state update', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce(sampleEvidence);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.evidence).toHaveLength(2);
      expect(result.evidence![0].type).toBe(EvidenceType.Screenshot);
      expect(result.evidence![1].type).toBe(EvidenceType.TestOutput);
    });

    it('should return empty evidence array when parser returns empty', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce([]);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.evidence).toEqual([]);
    });
  });

  // --- State update shape ---
  describe('state update', () => {
    it('should return currentNode as evidence', async () => {
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.currentNode).toBe('evidence');
    });

    it('should return messages array with completion message', async () => {
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.messages!.some((m) => m.includes('[evidence]'))).toBe(true);
    });

    it('should include evidence count in completion message', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce(sampleEvidence);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.includes('2'))).toBe(true);
    });
  });

  // --- Graceful degradation (FR-8) ---
  describe('graceful degradation', () => {
    it('should return empty evidence when parseEvidenceRecords throws', async () => {
      mockParseEvidenceRecords.mockImplementationOnce(() => {
        throw new Error('JSON parse failure');
      });
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.evidence).toEqual([]);
      expect(result.currentNode).toBe('evidence');
    });

    it('should still mark phase complete when parsing fails', async () => {
      mockParseEvidenceRecords.mockImplementationOnce(() => {
        throw new Error('Parse failure');
      });
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'evidence',
        expect.anything()
      );
    });

    it('should include warning message when parsing fails', async () => {
      mockParseEvidenceRecords.mockImplementationOnce(() => {
        throw new Error('Parse failure');
      });
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(
        result.messages!.some(
          (m) => m.toLowerCase().includes('warning') || m.toLowerCase().includes('failed')
        )
      ).toBe(true);
    });
  });

  // --- Resume support ---
  describe('resume support', () => {
    it('should skip execution when evidence phase already in completedPhases', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['evidence']);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(executor.execute).not.toHaveBeenCalled();
      expect(result.currentNode).toBe('evidence');
    });

    it('should return skip message when already completed', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['evidence']);
      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.includes('evidence'))).toBe(true);
    });

    it('should execute normally when other phases are completed but not evidence', async () => {
      mockGetCompletedPhases.mockReturnValueOnce(['analyze', 'requirements', 'implement']);
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(executor.execute).toHaveBeenCalled();
    });
  });

  // --- Phase marking ---
  describe('phase completion marking', () => {
    it('should mark evidence phase complete after successful execution', async () => {
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(mockMarkPhaseComplete).toHaveBeenCalledWith(
        '/tmp/specs',
        'evidence',
        expect.anything()
      );
    });

    it('should record phase timing start and end', async () => {
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('evidence');
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith('timing-456', expect.any(Number));
    });
  });

  // --- Error handling ---
  describe('error handling', () => {
    it('should re-throw GraphBubbleUp errors', async () => {
      const bubbleUpError = new Error('GraphBubbleUp');
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(bubbleUpError);
      mockIsGraphBubbleUp.mockReturnValueOnce(true);

      const node = createEvidenceNode(executor);
      await expect(node(baseState())).rejects.toThrow('GraphBubbleUp');
    });

    it('should throw on non-retryable executor errors', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Process exited with code 1')
      );

      const node = createEvidenceNode(executor);
      await expect(node(baseState())).rejects.toThrow('Process exited with code 1');
    });

    it('should record phase timing even when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Execution failed')
      );

      const node = createEvidenceNode(executor);
      await expect(node(baseState())).rejects.toThrow('Execution failed');

      expect(mockRecordPhaseStart).toHaveBeenCalledWith('evidence');
      expect(mockRecordPhaseEnd).toHaveBeenCalledWith('timing-456', expect.any(Number));
    });

    it('should NOT mark phase complete when executor fails', async () => {
      (executor.execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Execution failed')
      );

      const node = createEvidenceNode(executor);
      await expect(node(baseState())).rejects.toThrow('Execution failed');

      expect(mockMarkPhaseComplete).not.toHaveBeenCalled();
    });
  });

  // --- UI evidence app-level proof validation ---
  describe('ui evidence app-level proof validation', () => {
    it('should call validateUiEvidenceHasAppProof with parsed evidence', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce(sampleEvidence);
      const node = createEvidenceNode(executor);
      await node(baseState());

      expect(mockValidateUiEvidenceHasAppProof).toHaveBeenCalledWith(sampleEvidence);
    });

    it('should include validation warnings in messages when storybook-only evidence detected', async () => {
      const storybookOnlyEvidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Storybook: toggle component',
          relativePath: '.shep/evidence/storybook-toggle.png',
        },
      ];
      mockParseEvidenceRecords.mockReturnValueOnce(storybookOnlyEvidence);
      mockValidateUiEvidenceHasAppProof.mockReturnValueOnce({
        valid: false,
        hasScreenshots: true,
        hasAppScreenshots: false,
        hasOnlyStorybookScreenshots: true,
        warnings: [
          'UI evidence contains only Storybook screenshots. App-level screenshots from the running application are REQUIRED for UI features.',
        ],
      });

      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      expect(result.messages!.some((m) => m.includes('Storybook'))).toBe(true);
      expect(result.messages!.some((m) => m.includes('REQUIRED'))).toBe(true);
    });

    it('should not include validation warnings when app-level evidence is present', async () => {
      mockParseEvidenceRecords.mockReturnValueOnce(sampleEvidence);
      mockValidateUiEvidenceHasAppProof.mockReturnValueOnce({
        valid: true,
        hasScreenshots: true,
        hasAppScreenshots: true,
        hasOnlyStorybookScreenshots: false,
        warnings: [],
      });

      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      const validationWarnings = result.messages!.filter(
        (m) => m.includes('Storybook') || m.includes('app-level')
      );
      expect(validationWarnings).toHaveLength(0);
    });

    it('should still return evidence even when validation warns about storybook-only', async () => {
      const storybookEvidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Storybook: component view',
          relativePath: '.shep/evidence/storybook.png',
        },
      ];
      mockParseEvidenceRecords.mockReturnValueOnce(storybookEvidence);
      mockValidateUiEvidenceHasAppProof.mockReturnValueOnce({
        valid: false,
        hasScreenshots: true,
        hasAppScreenshots: false,
        hasOnlyStorybookScreenshots: true,
        warnings: ['UI evidence contains only Storybook screenshots.'],
      });

      const node = createEvidenceNode(executor);
      const result = await node(baseState());

      // Evidence is still returned (validation is informational, not blocking)
      expect(result.evidence).toEqual(storybookEvidence);
      expect(result.evidence).toHaveLength(1);
    });
  });

  // --- No approval gate ---
  describe('no approval gate', () => {
    it('should not import or use interrupt (evidence always runs automatically)', async () => {
      // Evidence node does not call shouldInterrupt or interrupt — verify by checking
      // that it completes without any interrupt-related state changes
      const node = createEvidenceNode(executor);
      const result = await node(
        baseState({ approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false } })
      );

      // Node should complete normally without interrupting
      expect(result.currentNode).toBe('evidence');
      expect(result._needsReexecution).toBe(false);
      // _approvalAction should not be set (evidence doesn't use approval gates)
      expect(result._approvalAction).toBeUndefined();
    });
  });
});

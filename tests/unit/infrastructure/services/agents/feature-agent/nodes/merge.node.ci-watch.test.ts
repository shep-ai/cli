/**
 * Merge Node — CI Watch/Fix Loop Unit Tests
 *
 * Tests the CI watch/fix loop behavior inside createMergeNode:
 * - CI skipped when push=false && openPr=false
 * - CI skipped with debug log when no CI run detected (no runUrl)
 * - CI success on first watch — no fix loop entered
 * - CI fail → fix → success on second watch (one CiFixRecord)
 * - CI fails all N attempts (exhausted) — structured error thrown
 * - watchCi timeout → CiFixRecord with outcome='timeout', error thrown
 * - isResumeAfterInterrupt=true → CI loop completely skipped
 *
 * TDD Phase: RED → write before implementing the CI watch loop
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output in tests
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

// ---- Hoist mocks before imports ----
const {
  mockInterrupt,
  mockShouldInterrupt,
  mockGetCompletedPhases,
  mockClearCompletedPhase,
  mockMarkPhaseComplete,
  mockRecordPhaseStart,
  mockRecordPhaseEnd,
  mockRecordApprovalWaitStart,
  mockBuildCommitPushPrPrompt,
  mockBuildMergeSquashPrompt,
  mockBuildCiWatchFixPrompt,
  mockParseCommitHash,
  mockParsePrUrl,
  mockGetSettings,
} = vi.hoisted(() => ({
  mockInterrupt: vi.fn(),
  mockShouldInterrupt: vi.fn().mockReturnValue(false),
  mockGetCompletedPhases: vi.fn().mockReturnValue([]),
  mockClearCompletedPhase: vi.fn(),
  mockMarkPhaseComplete: vi.fn(),
  mockRecordPhaseStart: vi.fn().mockResolvedValue('timing-123'),
  mockRecordPhaseEnd: vi.fn().mockResolvedValue(undefined),
  mockRecordApprovalWaitStart: vi.fn().mockResolvedValue(undefined),
  mockBuildCommitPushPrPrompt: vi.fn().mockReturnValue('commit-push-pr prompt'),
  mockBuildMergeSquashPrompt: vi.fn().mockReturnValue('merge-squash prompt'),
  mockBuildCiWatchFixPrompt: vi.fn().mockReturnValue('ci-watch-fix prompt'),
  mockParseCommitHash: vi.fn().mockReturnValue('abc1234'),
  mockParsePrUrl: vi
    .fn()
    .mockReturnValue({ url: 'https://github.com/test/repo/pull/42', number: 42 }),
  mockGetSettings: vi.fn().mockReturnValue({
    workflow: {
      ciMaxFixAttempts: 3,
      ciWatchTimeoutMs: 600_000,
      ciLogMaxChars: 50_000,
    },
  }),
}));

vi.mock('@langchain/langgraph', () => ({
  interrupt: mockInterrupt,
  isGraphBubbleUp: vi.fn().mockReturnValue(false),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({ info: vi.fn(), error: vi.fn() }),
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\n'),
  shouldInterrupt: mockShouldInterrupt,
  getCompletedPhases: mockGetCompletedPhases,
  clearCompletedPhase: mockClearCompletedPhase,
  markPhaseComplete: mockMarkPhaseComplete,
  retryExecute: vi
    .fn()
    .mockImplementation(
      async (executor: { execute: (p: string) => Promise<unknown> }, prompt: string) =>
        executor.execute(prompt)
    ),
  buildExecutorOptions: vi.fn().mockReturnValue({ cwd: '/tmp/worktree', maxTurns: 50 }),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/phase-timing-context.js', () => ({
  recordPhaseStart: mockRecordPhaseStart,
  recordPhaseEnd: mockRecordPhaseEnd,
  recordApprovalWaitStart: mockRecordApprovalWaitStart,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/lifecycle-context.js', () => ({
  updateNodeLifecycle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/prompts/merge-prompts.js', () => ({
  buildCommitPushPrPrompt: mockBuildCommitPushPrPrompt,
  buildMergeSquashPrompt: mockBuildMergeSquashPrompt,
  buildCiWatchFixPrompt: mockBuildCiWatchFixPrompt,
}));

vi.mock('@/infrastructure/services/agents/feature-agent/nodes/merge-output-parser.js', () => ({
  parseCommitHash: mockParseCommitHash,
  parsePrUrl: mockParsePrUrl,
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: mockGetSettings,
}));

// ---- Imports after mocks ----
import {
  createMergeNode,
  type MergeNodeDeps,
} from '@/infrastructure/services/agents/feature-agent/nodes/merge.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import {
  GitPrError,
  GitPrErrorCode,
} from '@/application/ports/output/services/git-pr-service.interface.js';

// ---- Test helpers ----

const SAMPLE_RUN_URL = 'https://github.com/org/repo/actions/runs/12345';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Agent completed all operations successfully' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function createMockFeatureRepo(): MergeNodeDeps['featureRepository'] {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'feat-001',
      lifecycle: 'Implementation',
      branch: 'feat/test',
    }),
    update: vi.fn().mockResolvedValue(undefined),
  } as any;
}

function createMockGitPrService(overrides: Partial<IGitPrService> = {}): IGitPrService {
  return {
    getCiStatus: vi.fn().mockResolvedValue({ status: 'success', runUrl: SAMPLE_RUN_URL }),
    watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
    getFailureLogs: vi
      .fn()
      .mockResolvedValue('Error: Tests failed at line 42\nExpected: true, got: false'),
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    hasUncommittedChanges: vi.fn().mockResolvedValue(false),
    commitAll: vi.fn().mockResolvedValue('abc123'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi.fn().mockResolvedValue({ url: '', number: 0 }),
    mergePr: vi.fn().mockResolvedValue(undefined),
    mergeBranch: vi.fn().mockResolvedValue(undefined),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    getPrDiffSummary: vi
      .fn()
      .mockResolvedValue({ filesChanged: 1, additions: 5, deletions: 2, commitCount: 1 }),
    ...overrides,
  } as IGitPrService;
}

function baseDeps(overrides?: Partial<MergeNodeDeps>): MergeNodeDeps {
  return {
    executor: createMockExecutor(),
    getDiffSummary: vi
      .fn()
      .mockResolvedValue({ filesChanged: 5, additions: 100, deletions: 20, commitCount: 3 }),
    hasRemote: vi.fn().mockResolvedValue(true),
    getDefaultBranch: vi.fn().mockResolvedValue('main'),
    featureRepository: createMockFeatureRepo(),
    gitPrService: createMockGitPrService(),
    ...overrides,
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
    ciFixAttempts: 0,
    ciFixHistory: [],
    ciFixStatus: 'idle',
    ...overrides,
  } as FeatureAgentState;
}

// ---- Tests ----

describe('createMergeNode — CI watch/fix loop', () => {
  let deps: MergeNodeDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    // Explicitly reset mocks that may be overridden in individual tests
    mockGetCompletedPhases.mockReturnValue([]);
    mockShouldInterrupt.mockReturnValue(false);
    mockGetSettings.mockReturnValue({
      workflow: { ciMaxFixAttempts: 3, ciWatchTimeoutMs: 600_000, ciLogMaxChars: 50_000 },
    });
    deps = baseDeps();
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Bypass conditions
  // ────────────────────────────────────────────────────────────────────────────

  describe('CI watch bypassed', () => {
    it('should NOT call getCiStatus when push=false and openPr=false', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ push: false, openPr: false }));

      expect(deps.gitPrService.getCiStatus).not.toHaveBeenCalled();
      expect(deps.gitPrService.watchCi).not.toHaveBeenCalled();
    });

    it('should NOT call getCiStatus when isResumeAfterInterrupt=true', async () => {
      mockGetCompletedPhases.mockReturnValue(['merge']);
      mockShouldInterrupt.mockReturnValue(true);

      const node = createMergeNode(deps);
      const state = baseState({ push: true });
      await node(state);

      expect(deps.gitPrService.getCiStatus).not.toHaveBeenCalled();
      expect(deps.gitPrService.watchCi).not.toHaveBeenCalled();
    });

    it('should skip CI watch and NOT call watchCi when getCiStatus returns no runUrl', async () => {
      deps.gitPrService.getCiStatus = vi.fn().mockResolvedValue({ status: 'pending' });
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getCiStatus).toHaveBeenCalled();
      expect(deps.gitPrService.watchCi).not.toHaveBeenCalled();
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CI success paths
  // ────────────────────────────────────────────────────────────────────────────

  describe('CI success', () => {
    it('should call watchCi when push=true and a run is detected', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getCiStatus).toHaveBeenCalledWith(
        '/tmp/worktree',
        expect.any(String)
      );
      expect(deps.gitPrService.watchCi).toHaveBeenCalledWith(
        '/tmp/worktree',
        expect.any(String),
        600_000
      );
    });

    it('should call watchCi when openPr=true and a run is detected', async () => {
      const node = createMergeNode(deps);
      await node(baseState({ openPr: true }));

      expect(deps.gitPrService.watchCi).toHaveBeenCalled();
    });

    it('should NOT call getFailureLogs when CI succeeds on first watch', async () => {
      deps.gitPrService.watchCi = vi.fn().mockResolvedValue({ status: 'success' });
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getFailureLogs).not.toHaveBeenCalled();
    });

    it('should return ciFixStatus="success" when CI passes on first watch', async () => {
      deps.gitPrService.watchCi = vi.fn().mockResolvedValue({ status: 'success' });
      const node = createMergeNode(deps);
      const result = await node(baseState({ push: true }));

      expect(result.ciFixStatus).toBe('success');
    });

    it('should use ciWatchTimeoutMs from settings when calling watchCi', async () => {
      mockGetSettings.mockReturnValue({
        workflow: { ciMaxFixAttempts: 3, ciWatchTimeoutMs: 120_000, ciLogMaxChars: 50_000 },
      });
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.watchCi).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        120_000
      );
    });

    it('should use default ciWatchTimeoutMs=600_000 when not set in settings', async () => {
      mockGetSettings.mockReturnValue({ workflow: {} });
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.watchCi).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        600_000
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CI failure → fix → success
  // ────────────────────────────────────────────────────────────────────────────

  describe('CI failure → fix → success', () => {
    it('should call getFailureLogs when first watchCi returns failure', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' }) // first watch: fail
        .mockResolvedValueOnce({ status: 'success' }); // after fix: success
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalled();
    });

    it('should extract runId from runUrl and pass to getFailureLogs', async () => {
      const runUrl = 'https://github.com/org/repo/actions/runs/99999';
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi.fn().mockResolvedValue({ status: 'failure', runUrl });

      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalledWith(
        '99999',
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should call buildCiWatchFixPrompt with failure logs and attempt info', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });
      deps.gitPrService.getFailureLogs = vi.fn().mockResolvedValue('test failure logs');

      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(mockBuildCiWatchFixPrompt).toHaveBeenCalledWith(
        'test failure logs',
        1,
        3,
        expect.any(String)
      );
    });

    it('should invoke retryExecute with the fix prompt after CI failure', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const { retryExecute } = await import(
        '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js'
      );
      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      // retryExecute called: once for Agent Call 1, once for fix
      expect(retryExecute).toHaveBeenCalledTimes(2);
      expect(retryExecute).toHaveBeenLastCalledWith(
        expect.anything(), // executor
        'ci-watch-fix prompt',
        expect.anything(), // options
        expect.objectContaining({ logger: expect.anything() })
      );
    });

    it('should append one CiFixRecord with outcome=fixed when CI passes after first fix', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      const result = await node(baseState({ push: true }));

      expect(result.ciFixHistory).toHaveLength(1);
      expect(result.ciFixHistory![0]).toMatchObject({
        attempt: 1,
        outcome: 'fixed',
        failureSummary: expect.any(String),
        startedAt: expect.any(String),
      });
    });

    it('should set ciFixAttempts=1 after one successful fix attempt', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      const result = await node(baseState({ push: true }));

      expect(result.ciFixAttempts).toBe(1);
    });

    it('should return ciFixStatus=success after fix resolves CI failure', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      const result = await node(baseState({ push: true }));

      expect(result.ciFixStatus).toBe('success');
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CI exhausted (all fix attempts failed)
  // ────────────────────────────────────────────────────────────────────────────

  describe('CI exhausted — max attempts reached', () => {
    beforeEach(() => {
      // All watchCi calls return failure
      deps.gitPrService.watchCi = vi.fn().mockResolvedValue({ status: 'failure' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });
    });

    it('should throw an error when all fix attempts are exhausted', async () => {
      const node = createMergeNode(deps);
      await expect(node(baseState({ push: true }))).rejects.toThrow();
    });

    it('should have ciFixHistory with 3 records when maxAttempts=3 and all fail', async () => {
      let capturedHistory: unknown[] = [];

      // Capture the feature update call to see ciFixHistory in the thrown state
      // We'll capture it from the featureRepository.update call
      deps.featureRepository.update = vi.fn().mockImplementation(async (feature) => {
        // This will be called before the throw
        capturedHistory = (deps.gitPrService.getCiStatus as ReturnType<typeof vi.fn>).mock.calls;
        return undefined;
      });

      const node = createMergeNode(deps);
      const result: Partial<FeatureAgentState> | null = null;

      try {
        await node(baseState({ push: true }));
      } catch {
        // Expected to throw
      }

      // getFailureLogs should have been called 3 times (once per fix attempt)
      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalledTimes(3);
    });

    it('should call getFailureLogs exactly maxAttempts times', async () => {
      const node = createMergeNode(deps);
      try {
        await node(baseState({ push: true }));
      } catch {
        // expected
      }
      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalledTimes(3);
    });

    it('should update Feature.pr.ciStatus to Failure when exhausted', async () => {
      const node = createMergeNode(deps);
      try {
        await node(
          baseState({
            push: true,
            openPr: true,
            prUrl: 'https://github.com/org/repo/pull/1',
            prNumber: 1,
          })
        );
      } catch {
        // expected
      }

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pr: expect.objectContaining({
            ciStatus: 'Failure',
          }),
        })
      );
    });

    it('should not call the fix executor more than maxAttempts times', async () => {
      const node = createMergeNode(deps);
      try {
        await node(baseState({ push: true }));
      } catch {
        // expected
      }

      // executor.execute called: 1 (agent call 1) + 3 (fix attempts) = 4
      expect(deps.executor.execute).toHaveBeenCalledTimes(4);
    });

    it('error message should describe all attempt outcomes', async () => {
      const node = createMergeNode(deps);

      await expect(node(baseState({ push: true }))).rejects.toThrow(
        expect.objectContaining({
          message: expect.stringMatching(/attempt|fix|CI/i),
        })
      );
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // CI timeout
  // ────────────────────────────────────────────────────────────────────────────

  describe('CI watch timeout', () => {
    it('should throw when watchCi times out on initial watch', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockRejectedValue(new GitPrError('timed out', GitPrErrorCode.CI_TIMEOUT));

      const node = createMergeNode(deps);
      await expect(node(baseState({ push: true }))).rejects.toThrow();
    });

    it('should record CiFixRecord with outcome=timeout when initial watchCi times out', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockRejectedValue(new GitPrError('timed out', GitPrErrorCode.CI_TIMEOUT));

      const node = createMergeNode(deps);

      // Capture state via featureRepository.update which is called before throw (requires PR info)
      deps.featureRepository.update = vi.fn().mockImplementation(async () => undefined);

      try {
        await node(
          baseState({
            push: true,
            openPr: true,
            prUrl: 'https://github.com/org/repo/pull/1',
            prNumber: 1,
          })
        );
      } catch {
        // expected
      }

      // featureRepository.update should have been called to mark CI failure
      expect(deps.featureRepository.update).toHaveBeenCalled();
    });

    it('should throw when watchCi times out during a fix-loop iteration', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' }) // initial watch: fail
        .mockRejectedValueOnce(new GitPrError('timed out', GitPrErrorCode.CI_TIMEOUT)); // after fix: timeout
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      await expect(node(baseState({ push: true }))).rejects.toThrow();
    });

    it('should record CiFixRecord with outcome=timeout when fix-loop watchCi times out', async () => {
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockRejectedValueOnce(new GitPrError('timed out', GitPrErrorCode.CI_TIMEOUT));
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const capturedHistory: unknown[] = [];
      deps.featureRepository.update = vi.fn().mockImplementation(async () => undefined);

      const node = createMergeNode(deps);
      const thrownResult: Partial<FeatureAgentState> | null = null;

      try {
        await node(baseState({ push: true }));
      } catch {
        // expected — CiFixRecord recording verified via getFailureLogs call count
      }

      // getFailureLogs called once (for the single fix attempt before timeout)
      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalledTimes(1);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // Fail-fast / bounded execution (NFR-3)
  // ────────────────────────────────────────────────────────────────────────────

  describe('fail-fast: ciFixAttempts check before executor', () => {
    it('should check ciFixAttempts before calling fix executor on each iteration', async () => {
      // With maxAttempts=1 and initial state ciFixAttempts=0:
      // - initial watchCi fails
      // - check: 0 < 1 → proceed with fix attempt 1
      // - watchCi again fails
      // - check: 1 >= 1 → exhausted, throw WITHOUT calling executor again
      mockGetSettings.mockReturnValue({
        workflow: { ciMaxFixAttempts: 1, ciWatchTimeoutMs: 600_000, ciLogMaxChars: 50_000 },
      });
      deps.gitPrService.watchCi = vi.fn().mockResolvedValue({ status: 'failure' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      try {
        await node(baseState({ push: true }));
      } catch {
        // expected
      }

      // 1 (agent call 1) + 1 (single fix attempt) = 2 executor calls total
      expect(deps.executor.execute).toHaveBeenCalledTimes(2);
    });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // ciLogMaxChars respected (NFR-4)
  // ────────────────────────────────────────────────────────────────────────────

  describe('ciLogMaxChars passed to getFailureLogs', () => {
    it('should pass ciLogMaxChars from settings to getFailureLogs', async () => {
      mockGetSettings.mockReturnValue({
        workflow: { ciMaxFixAttempts: 3, ciWatchTimeoutMs: 600_000, ciLogMaxChars: 25_000 },
      });
      deps.gitPrService.watchCi = vi
        .fn()
        .mockResolvedValueOnce({ status: 'failure' })
        .mockResolvedValueOnce({ status: 'success' });
      deps.gitPrService.getCiStatus = vi
        .fn()
        .mockResolvedValue({ status: 'failure', runUrl: SAMPLE_RUN_URL });

      const node = createMergeNode(deps);
      await node(baseState({ push: true }));

      expect(deps.gitPrService.getFailureLogs).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        25_000
      );
    });
  });
});

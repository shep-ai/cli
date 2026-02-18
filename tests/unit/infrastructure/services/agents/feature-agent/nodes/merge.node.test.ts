/**
 * Merge Node Unit Tests
 *
 * Tests for the merge node which handles:
 * - Validation, commit, and push (task 17)
 * - pr.yaml generation and optional PR creation (task 18)
 * - Merge step with approval gate (task 19)
 * - Lifecycle transition and cleanup (task 20)
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Suppress logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

const { mockInterrupt, mockShouldInterrupt } = vi.hoisted(() => ({
  mockInterrupt: vi.fn(),
  mockShouldInterrupt: vi.fn().mockReturnValue(false),
}));

// Mock LangGraph interrupt
vi.mock('@langchain/langgraph', () => ({
  interrupt: mockInterrupt,
  isGraphBubbleUp: vi.fn().mockReturnValue(false),
}));

// Mock node-helpers
vi.mock('@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js', () => ({
  createNodeLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
  }),
  readSpecFile: vi.fn().mockReturnValue('name: Test Feature\ndescription: A test\n'),
  shouldInterrupt: mockShouldInterrupt,
}));

// Mock heartbeat
vi.mock('@/infrastructure/services/agents/feature-agent/heartbeat.js', () => ({
  reportNodeStart: vi.fn(),
}));

import {
  createMergeNode,
  type MergeNodeDeps,
} from '@/infrastructure/services/agents/feature-agent/nodes/merge.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';

function createMockGitPrService(): IGitPrService {
  return {
    hasUncommittedChanges: vi.fn().mockResolvedValue(true),
    commitAll: vi.fn().mockResolvedValue('abc123'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi.fn().mockResolvedValue({ url: 'https://github.com/test/pr/1', number: 1 }),
    mergePr: vi.fn().mockResolvedValue(undefined),
    mergeBranch: vi.fn().mockResolvedValue(undefined),
    getCiStatus: vi.fn().mockResolvedValue({ status: 'success' }),
    watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    getPrDiffSummary: vi.fn().mockResolvedValue({
      filesChanged: 5,
      additions: 100,
      deletions: 20,
      commitCount: 3,
    }),
  };
}

function createMockPrYamlGenerator(): MergeNodeDeps['generatePrYaml'] {
  return vi.fn().mockReturnValue('/tmp/specs/pr.yaml');
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

function baseDeps(): MergeNodeDeps {
  return {
    gitPrService: createMockGitPrService(),
    generatePrYaml: createMockPrYamlGenerator(),
    featureRepository: createMockFeatureRepo(),
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
    ...overrides,
  } as FeatureAgentState;
}

describe('createMergeNode', () => {
  let deps: MergeNodeDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = baseDeps();
  });

  // --- Task 17: Validation, commit, and push ---
  describe('commit and push step', () => {
    it('should check for uncommitted changes and commit if present', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(deps.gitPrService.hasUncommittedChanges).toHaveBeenCalledWith('/tmp/worktree');
      expect(deps.gitPrService.commitAll).toHaveBeenCalledWith(
        '/tmp/worktree',
        expect.stringContaining('feat')
      );
    });

    it('should skip commit when no uncommitted changes', async () => {
      (deps.gitPrService.hasUncommittedChanges as ReturnType<typeof vi.fn>).mockResolvedValue(
        false
      );
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(deps.gitPrService.commitAll).not.toHaveBeenCalled();
    });

    it('should push with --set-upstream when push=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ push: true });
      await node(state);

      expect(deps.gitPrService.push).toHaveBeenCalledWith(
        '/tmp/worktree',
        expect.any(String),
        true
      );
    });

    it('should skip push when push=false and no openPr', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ push: false, openPr: false });
      await node(state);

      expect(deps.gitPrService.push).not.toHaveBeenCalled();
    });

    it('should push when openPr=true even if push=false (implied)', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ push: false, openPr: true });
      await node(state);

      expect(deps.gitPrService.push).toHaveBeenCalled();
    });

    it('should NOT push when only allowMerge=true (local merge does not require push)', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        push: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
        openPr: false,
      });
      await node(state);

      expect(deps.gitPrService.push).not.toHaveBeenCalled();
    });

    it('should return commitHash in state', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      const result = await node(state);

      expect(result.commitHash).toBe('abc123');
    });
  });

  // --- Task 18: pr.yaml generation and PR creation ---
  describe('pr.yaml generation and PR creation', () => {
    it('should always generate pr.yaml', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: false });
      await node(state);

      expect(deps.generatePrYaml).toHaveBeenCalledWith('/tmp/specs', expect.any(String), 'main');
    });

    it('should create PR when openPr=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true });
      const result = await node(state);

      expect(deps.gitPrService.createPr).toHaveBeenCalledWith(
        '/tmp/worktree',
        '/tmp/specs/pr.yaml'
      );
      expect(result.prUrl).toBe('https://github.com/test/pr/1');
      expect(result.prNumber).toBe(1);
    });

    it('should NOT create PR when openPr=false', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: false });
      await node(state);

      expect(deps.gitPrService.createPr).not.toHaveBeenCalled();
    });

    it('should watch CI after PR creation when openPr=true and allowMerge=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        openPr: true,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(deps.gitPrService.watchCi).toHaveBeenCalled();
    });

    it('should skip PR creation if prUrl already exists (idempotent)', async () => {
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true, prUrl: 'https://github.com/test/pr/1', prNumber: 1 });
      await node(state);

      expect(deps.gitPrService.createPr).not.toHaveBeenCalled();
    });
  });

  // --- Task 19: Merge step with approval gate ---
  describe('merge step', () => {
    it('should merge PR when allowMerge=true and openPr=true', async () => {
      (deps.gitPrService.watchCi as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'success',
      });
      const node = createMergeNode(deps);
      const state = baseState({
        openPr: true,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(deps.gitPrService.mergePr).toHaveBeenCalled();
    });

    it('should merge branch directly when allowMerge=true and openPr=false', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(deps.gitPrService.mergeBranch).toHaveBeenCalledWith(
        '/tmp/worktree',
        expect.any(String),
        'main'
      );
    });

    it('should NOT merge when allowMerge=false', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        openPr: true,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
      await node(state);

      expect(deps.gitPrService.mergePr).not.toHaveBeenCalled();
      expect(deps.gitPrService.mergeBranch).not.toHaveBeenCalled();
    });

    it('should include diff summary in interrupt payload when allowMerge=false', async () => {
      mockShouldInterrupt.mockReturnValueOnce(true);

      const node = createMergeNode(deps);
      const state = baseState({
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
      await node(state);

      expect(mockInterrupt).toHaveBeenCalledWith(
        expect.objectContaining({
          node: 'merge',
          diffSummary: expect.objectContaining({
            filesChanged: 5,
          }),
        })
      );
    });
  });

  // --- Task 20: Lifecycle transition and cleanup ---
  describe('lifecycle transition and cleanup', () => {
    it('should update feature to Review lifecycle when not merged (no allowMerge)', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      await node(state);

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: 'Review',
        })
      );
    });

    it('should update feature to Maintain lifecycle when allowMerge=true', async () => {
      const node = createMergeNode(deps);
      const state = baseState({
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: true },
      });
      await node(state);

      expect(deps.featureRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: 'Maintain',
        })
      );
    });

    it('should return messages about merge node completion', async () => {
      const node = createMergeNode(deps);
      const state = baseState();
      const result = await node(state);

      expect(result.messages).toBeDefined();
      expect(result.messages!.length).toBeGreaterThan(0);
      expect(result.currentNode).toBe('merge');
    });
  });

  // --- Error handling ---
  // Errors are re-thrown (not caught) so LangGraph can checkpoint properly
  // and `feat resume` retries from the merge node instead of restarting.
  describe('error handling', () => {
    it('should throw when push fails (allows LangGraph resume)', async () => {
      (deps.gitPrService.push as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Push rejected')
      );
      const node = createMergeNode(deps);
      const state = baseState({ push: true });

      await expect(node(state)).rejects.toThrow('Push rejected');
    });

    it('should throw when PR creation fails (allows LangGraph resume)', async () => {
      (deps.gitPrService.createPr as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('gh not found')
      );
      const node = createMergeNode(deps);
      const state = baseState({ openPr: true });

      await expect(node(state)).rejects.toThrow('gh not found');
    });
  });
});

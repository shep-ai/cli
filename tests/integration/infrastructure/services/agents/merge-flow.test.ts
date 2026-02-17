/**
 * Merge Flow Integration Tests
 *
 * Tests the full LangGraph merge node behavior within the compiled graph.
 * Uses real graph compilation with mock services (no git/GitHub calls).
 *
 * Covers:
 *   - Task 24: PR creation flow (openPr=true, autoMerge=false)
 *   - Task 25: Auto-merge via PR flow (openPr=true, autoMerge=true)
 *   - Task 26: Auto-merge direct flow (openPr=false, autoMerge=true)
 *   - Task 27: Review approval gate (allowMerge=false)
 *   - Task 28: Idempotency and full regression
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Command } from '@langchain/langgraph';
import {
  createFeatureAgentGraph,
  type FeatureAgentGraphDeps,
} from '../../../../../src/infrastructure/services/agents/feature-agent/feature-agent-graph.js';
import { createCheckpointer } from '../../../../../src/infrastructure/services/agents/common/checkpointer.js';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agents/agent-executor.interface.js';
import type { IGitPrService } from '../../../../../src/application/ports/output/services/git-pr-service.interface.js';
import type { MergeNodeDeps } from '../../../../../src/infrastructure/services/agents/feature-agent/nodes/merge.node.js';

function createMockExecutor(): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: 'Mock agent response for testing' }),
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
  };
}

function createMockGitPrService(): IGitPrService {
  return {
    hasUncommittedChanges: vi.fn().mockResolvedValue(true),
    commitAll: vi.fn().mockResolvedValue('abc123def'),
    push: vi.fn().mockResolvedValue(undefined),
    createPr: vi
      .fn()
      .mockResolvedValue({ url: 'https://github.com/test/repo/pull/42', number: 42 }),
    mergePr: vi.fn().mockResolvedValue(undefined),
    mergeBranch: vi.fn().mockResolvedValue(undefined),
    getCiStatus: vi.fn().mockResolvedValue({ status: 'success' }),
    watchCi: vi.fn().mockResolvedValue({ status: 'success' }),
    deleteBranch: vi.fn().mockResolvedValue(undefined),
    getPrDiffSummary: vi.fn().mockResolvedValue({
      filesChanged: 8,
      additions: 200,
      deletions: 30,
      commitCount: 5,
    }),
  };
}

function createMockFeatureRepo(): MergeNodeDeps['featureRepository'] {
  return {
    findById: vi.fn().mockResolvedValue({
      id: 'feat-merge-test',
      lifecycle: 'Implementation',
      branch: 'feat/merge-test',
    }),
    update: vi.fn().mockResolvedValue(undefined),
  } as any;
}

/** Extract interrupt payloads from a graph result. */
function getInterrupts(result: Record<string, unknown>): { value: Record<string, unknown> }[] {
  return (result.__interrupt__ as { value: Record<string, unknown> }[]) ?? [];
}

describe('Merge Flow (Graph-level)', () => {
  let tempDir: string;
  let specDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-merge-flow-test-'));
    specDir = join(tempDir, 'specs', '001-test');
    mkdirSync(specDir, { recursive: true });

    writeValidSpecFiles(specDir);

    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  beforeEach(() => {
    writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');
  });

  afterAll(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    rmSync(tempDir, { recursive: true, force: true });
  });

  function buildGraphDeps(overrides?: {
    gitPrService?: IGitPrService;
    featureRepo?: MergeNodeDeps['featureRepository'];
  }): {
    deps: FeatureAgentGraphDeps;
    gitPrService: IGitPrService;
    featureRepo: MergeNodeDeps['featureRepository'];
  } {
    const gitPrService = overrides?.gitPrService ?? createMockGitPrService();
    const featureRepo = overrides?.featureRepo ?? createMockFeatureRepo();
    const generatePrYaml = vi.fn().mockReturnValue(join(specDir, 'pr.yaml'));
    const deps: FeatureAgentGraphDeps = {
      executor: createMockExecutor(),
      mergeNodeDeps: { gitPrService, generatePrYaml, featureRepository: featureRepo },
    };
    return { deps, gitPrService, featureRepo };
  }

  function baseInput(overrides: Record<string, unknown> = {}) {
    return {
      featureId: 'feat-merge-test',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      // Default: fully autonomous through analyze/requirements/research/plan/implement
      // so we reach merge node quickly
      ...overrides,
    };
  }

  // --- Task 24: PR creation flow (openPr=true, autoMerge=false) ---
  describe('PR creation flow (openPr=true, autoMerge=false)', () => {
    it('should commit, push, generate pr.yaml, create PR, and set lifecycle to Review', async () => {
      const { deps, gitPrService, featureRepo } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'pr-creation-flow' } };

      const result = await graph.invoke(baseInput({ openPr: true, autoMerge: false }), config);

      // Graph should complete without interrupts (no approval gates set)
      expect(getInterrupts(result)).toHaveLength(0);

      // Verify commit and push
      expect(gitPrService.hasUncommittedChanges).toHaveBeenCalled();
      expect(gitPrService.commitAll).toHaveBeenCalled();
      expect(gitPrService.push).toHaveBeenCalled();

      // Verify PR created
      expect(gitPrService.createPr).toHaveBeenCalled();
      expect(result.prUrl).toBe('https://github.com/test/repo/pull/42');
      expect(result.prNumber).toBe(42);

      // Verify CI NOT watched (autoMerge=false, no need to watch)
      expect(gitPrService.watchCi).not.toHaveBeenCalled();

      // Verify NO merge happened
      expect(gitPrService.mergePr).not.toHaveBeenCalled();
      expect(gitPrService.mergeBranch).not.toHaveBeenCalled();

      // Verify lifecycle set to Review
      expect(featureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Review' })
      );
    });

    it('should include pr.yaml generation in messages', async () => {
      const { deps } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'pr-creation-messages' } };

      const result = await graph.invoke(baseInput({ openPr: true, autoMerge: false }), config);

      const mergeMessages = result.messages.filter((m: string) => m.startsWith('[merge]'));
      expect(mergeMessages.length).toBeGreaterThanOrEqual(3); // commit, push, pr.yaml, PR created, lifecycle
    });
  });

  // --- Task 25: Auto-merge via PR flow (openPr=true, autoMerge=true) ---
  describe('auto-merge via PR flow (openPr=true, autoMerge=true)', () => {
    it('should create PR, watch CI, merge PR, and set lifecycle to Maintain', async () => {
      const { deps, gitPrService, featureRepo } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'auto-merge-pr-flow' } };

      const result = await graph.invoke(baseInput({ openPr: true, autoMerge: true }), config);

      expect(getInterrupts(result)).toHaveLength(0);

      // Verify PR created
      expect(gitPrService.createPr).toHaveBeenCalled();

      // Verify CI watched before merge
      expect(gitPrService.watchCi).toHaveBeenCalled();

      // Verify PR merged (not branch merge)
      expect(gitPrService.mergePr).toHaveBeenCalled();
      expect(gitPrService.mergeBranch).not.toHaveBeenCalled();

      // Verify lifecycle set to Maintain
      expect(featureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Maintain' })
      );

      expect(result.ciStatus).toBe('success');
    });
  });

  // --- Task 26: Auto-merge direct flow (openPr=false, autoMerge=true) ---
  describe('auto-merge direct flow (openPr=false, autoMerge=true)', () => {
    it('should NOT create PR, merge branch directly, and set lifecycle to Maintain', async () => {
      const { deps, gitPrService, featureRepo } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'auto-merge-direct-flow' } };

      const result = await graph.invoke(baseInput({ openPr: false, autoMerge: true }), config);

      expect(getInterrupts(result)).toHaveLength(0);

      // No PR created
      expect(gitPrService.createPr).not.toHaveBeenCalled();
      expect(gitPrService.watchCi).not.toHaveBeenCalled();

      // Direct branch merge
      expect(gitPrService.mergeBranch).toHaveBeenCalledWith(tempDir, expect.any(String), 'main');

      // PR merge NOT called
      expect(gitPrService.mergePr).not.toHaveBeenCalled();

      // Lifecycle = Maintain
      expect(featureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Maintain' })
      );
    });

    it('should still generate pr.yaml even without opening a PR', async () => {
      const { deps } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'direct-merge-pryaml' } };

      const result = await graph.invoke(baseInput({ openPr: false, autoMerge: true }), config);

      expect(deps.mergeNodeDeps.generatePrYaml).toHaveBeenCalled();
      const mergeMessages = result.messages.filter((m: string) => m.includes('pr.yaml'));
      expect(mergeMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- Task 27: Review approval gate (allowMerge=false) ---
  describe('review approval gate (allowMerge=false)', () => {
    it('should interrupt at merge node when allowMerge=false, then complete on resume', async () => {
      const { deps, gitPrService, featureRepo } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'merge-gate-thread' } };

      // allowPrd=true, allowPlan=true skips requirements/plan gates.
      // implement always interrupts when gates are present and not fully autonomous.
      const result1 = await graph.invoke(
        baseInput({
          openPr: false,
          autoMerge: false,
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: false },
        }),
        config
      );

      // First interrupt: implement node (always interrupts when not fully autonomous)
      const interrupts1 = getInterrupts(result1);
      expect(interrupts1.length).toBe(1);
      expect(interrupts1[0].value.node).toBe('implement');

      // Resume past implement → should now interrupt at merge
      const result2 = await graph.invoke(new Command({ resume: { approved: true } }), config);
      const interrupts2 = getInterrupts(result2);
      expect(interrupts2.length).toBe(1);
      expect(interrupts2[0].value.node).toBe('merge');
      expect(interrupts2[0].value.diffSummary).toBeDefined();

      // Merge should NOT have been called yet
      expect(gitPrService.mergePr).not.toHaveBeenCalled();
      expect(gitPrService.mergeBranch).not.toHaveBeenCalled();

      // Resume past merge → completes
      const result3 = await graph.invoke(new Command({ resume: { approved: true } }), config);
      expect(getInterrupts(result3)).toHaveLength(0);

      // After resume, lifecycle should be updated to Review (autoMerge=false)
      expect(featureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Review' })
      );
    });

    it('should include diff summary in merge interrupt payload', async () => {
      const { deps } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'merge-gate-diff-thread' } };

      // First invoke → interrupt at implement
      await graph.invoke(
        baseInput({
          openPr: false,
          autoMerge: false,
          approvalGates: { allowPrd: true, allowPlan: true, allowMerge: false },
        }),
        config
      );

      // Resume past implement → interrupt at merge with diff summary
      const result = await graph.invoke(new Command({ resume: { approved: true } }), config);
      const interrupts = getInterrupts(result);
      expect(interrupts[0].value.node).toBe('merge');
      expect(interrupts[0].value.diffSummary).toEqual(
        expect.objectContaining({
          filesChanged: 8,
          additions: 200,
          deletions: 30,
        })
      );
    });
  });

  // --- Task 28: Idempotency and regression ---
  describe('idempotency and regression', () => {
    it('should skip PR creation when prUrl already set (idempotent resume)', async () => {
      const { deps, gitPrService } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'idempotent-pr-thread' } };

      // Simulate state where PR was already created (e.g., resumed run)
      const result = await graph.invoke(
        baseInput({
          openPr: true,
          autoMerge: false,
          prUrl: 'https://github.com/test/repo/pull/99',
          prNumber: 99,
        }),
        config
      );

      // PR should NOT be created again
      expect(gitPrService.createPr).not.toHaveBeenCalled();

      // But prUrl should be preserved in result
      expect(result.prUrl).toBe('https://github.com/test/repo/pull/99');
      expect(result.prNumber).toBe(99);
    });

    it('should complete full flow without errors (no approval gates, openPr=false, autoMerge=false)', async () => {
      const { deps, gitPrService, featureRepo } = buildGraphDeps();
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'full-regression-thread' } };

      const result = await graph.invoke(baseInput({ openPr: false, autoMerge: false }), config);

      expect(getInterrupts(result)).toHaveLength(0);
      expect(result.error).toBeNull();

      // Commit + push happened
      expect(gitPrService.commitAll).toHaveBeenCalled();
      expect(gitPrService.push).toHaveBeenCalled();

      // No PR, no merge
      expect(gitPrService.createPr).not.toHaveBeenCalled();
      expect(gitPrService.mergePr).not.toHaveBeenCalled();
      expect(gitPrService.mergeBranch).not.toHaveBeenCalled();

      // Lifecycle = Review (not merged)
      expect(featureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ lifecycle: 'Review' })
      );

      // Messages include merge node output
      expect(result.messages.some((m: string) => m.includes('[merge]'))).toBe(true);
    });

    it('should handle CI failure gracefully when auto-merging via PR', async () => {
      const gitPrService = createMockGitPrService();
      (gitPrService.watchCi as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 'failure',
        logExcerpt: 'Test failed: 1 of 10',
      });
      const { deps } = buildGraphDeps({ gitPrService });
      const checkpointer = createCheckpointer(':memory:');
      const graph = createFeatureAgentGraph(deps, checkpointer);
      const config = { configurable: { thread_id: 'ci-failure-thread' } };

      const result = await graph.invoke(baseInput({ openPr: true, autoMerge: true }), config);

      // CI watched
      expect(gitPrService.watchCi).toHaveBeenCalled();
      expect(result.ciStatus).toBe('failure');

      // Merge still attempted (merge node doesn't gate on CI status currently)
      // The merge node proceeds with merge regardless — CI gating is a future enhancement
      expect(gitPrService.mergePr).toHaveBeenCalled();
    });
  });
});

/** Write valid spec files that pass all validation gates. */
function writeValidSpecFiles(specDir: string) {
  writeFileSync(
    join(specDir, 'spec.yaml'),
    `${[
      'name: Merge Flow Test Feature',
      'oneLiner: A test feature for merge flow integration tests',
      'summary: This feature tests the merge flow with various configurations',
      'phase: implementation',
      'sizeEstimate: S',
      'content: Full description of the merge flow test feature',
      'technologies:',
      '  - TypeScript',
      'openQuestions: []',
    ].join('\n')}\n`
  );
  writeFileSync(
    join(specDir, 'research.yaml'),
    `${[
      'name: Merge Flow Research',
      'summary: Research for merge flow test',
      'content: Detailed research content for the merge flow',
      'decisions:',
      '  - title: Merge strategy',
      '    chosen: Squash merge',
      '    rejected:',
      '      - Rebase merge',
      '    rationale: Squash keeps history clean',
    ].join('\n')}\n`
  );
  writeFileSync(
    join(specDir, 'plan.yaml'),
    `${[
      'content: Implementation plan for merge flow',
      'phases:',
      '  - id: phase-1',
      '    name: Setup',
      '    parallel: false',
      '    taskIds:',
      '      - task-1',
      'filesToCreate:',
      '  - src/merge-flow.ts',
    ].join('\n')}\n`
  );
  writeFileSync(
    join(specDir, 'tasks.yaml'),
    `${[
      'tasks:',
      '  - id: task-1',
      '    phaseId: phase-1',
      '    title: Implement merge flow',
      '    description: Implement the merge flow feature',
      '    state: todo',
      '    dependencies: []',
      '    acceptanceCriteria:',
      '      - Merge works',
      '    tdd: null',
      '    estimatedEffort: small',
    ].join('\n')}\n`
  );
}

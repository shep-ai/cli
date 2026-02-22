/**
 * Graph State Transition Test Setup
 *
 * Shared setup for all graph state transition integration tests.
 * Provides real LangGraph graph with SQLite checkpointer and stubbed executor.
 *
 * Usage:
 *   const ctx = createTestContext();
 *   // in beforeAll: await ctx.init();
 *   // in beforeEach: ctx.reset();
 *   // in afterAll: ctx.cleanup();
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { vi, type Mock } from 'vitest';
import { createFeatureAgentGraph } from '@/infrastructure/services/agents/feature-agent/feature-agent-graph.js';
import { createCheckpointer } from '@/infrastructure/services/agents/common/checkpointer.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { ApprovalGates } from '@/domain/generated/output.js';
import {
  VALID_SPEC_YAML,
  VALID_RESEARCH_YAML,
  VALID_PLAN_YAML,
  VALID_TASKS_YAML,
} from './fixtures.js';

/* ------------------------------------------------------------------ */
/*  Stub Executor                                                     */
/* ------------------------------------------------------------------ */

export interface StubExecutor extends IAgentExecutor {
  /** Total number of execute() calls. */
  callCount: number;
  /** Prompts received in order. */
  prompts: string[];
  /** The underlying vi.fn() mock for execute(). */
  execute: Mock;
}

/**
 * Create a stub executor that records calls and returns canned results.
 * No AI calls are made.
 */
export function createStubExecutor(): StubExecutor {
  let callCount = 0;
  const prompts: string[] = [];

  const executeFn = vi.fn(async (prompt: string) => {
    callCount++;
    prompts.push(prompt);
    return { result: `stub result #${callCount}`, exitCode: 0 };
  });

  const stub: StubExecutor = {
    agentType: 'claude-code' as never,
    execute: executeFn,
    executeStream: vi.fn(),
    supportsFeature: vi.fn().mockReturnValue(false),
    get callCount() {
      return callCount;
    },
    prompts,
  };

  return stub;
}

/* ------------------------------------------------------------------ */
/*  Test Context                                                      */
/* ------------------------------------------------------------------ */

export interface TestContext {
  /** Temporary directory root for this test suite. */
  tempDir: string;
  /** Path to the spec directory inside tempDir. */
  specDir: string;
  /** The stub executor used by the graph. */
  executor: StubExecutor;
  /** The compiled LangGraph graph. */
  graph: ReturnType<typeof createFeatureAgentGraph>;
  /** Generate a unique graph config with isolated thread_id. */
  newConfig: () => { configurable: { thread_id: string } };
  /** Build initial state for graph.invoke(). */
  initialState: (gates?: ApprovalGates) => Record<string, unknown>;
  /** Reset feature.yaml to empty completedPhases (call in beforeEach). */
  reset: () => void;
  /** Initialize temp directory and write fixture files (call in beforeAll). */
  init: () => void;
  /** Clean up temp directory (call in afterAll). */
  cleanup: () => void;
  /** Suppress stdout/stderr (call in beforeAll, restore in afterAll). */
  suppressOutput: () => { restore: () => void };
}

/**
 * Create a test context for graph state transition tests.
 *
 * Encapsulates:
 * - Temp directory creation with valid spec YAML fixtures
 * - Real LangGraph graph with in-memory SQLite checkpointer
 * - Stub executor (no AI calls)
 * - Unique thread_id generation for checkpoint isolation
 */
export function createTestContext(): TestContext {
  let tempDir = '';
  let specDir = '';
  let executor: StubExecutor;
  let graph: ReturnType<typeof createFeatureAgentGraph>;

  const ctx: TestContext = {
    get tempDir() {
      return tempDir;
    },
    get specDir() {
      return specDir;
    },
    get executor() {
      return executor;
    },
    get graph() {
      return graph;
    },

    newConfig: () => ({
      configurable: { thread_id: `test-${randomUUID()}` },
    }),

    initialState: (gates?: ApprovalGates) => ({
      featureId: `feat-${randomUUID().slice(0, 8)}`,
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      ...(gates ? { approvalGates: gates } : {}),
    }),

    reset: () => {
      writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');
      // Re-create executor and graph for clean mock state
      executor = createStubExecutor();
      graph = createFeatureAgentGraph(executor, createCheckpointer(':memory:'));
    },

    init: () => {
      tempDir = mkdtempSync(join(tmpdir(), 'shep-gst-'));
      specDir = join(tempDir, 'specs', '001-test');
      mkdirSync(specDir, { recursive: true });

      writeFileSync(join(specDir, 'spec.yaml'), VALID_SPEC_YAML);
      writeFileSync(join(specDir, 'research.yaml'), VALID_RESEARCH_YAML);
      writeFileSync(join(specDir, 'plan.yaml'), VALID_PLAN_YAML);
      writeFileSync(join(specDir, 'tasks.yaml'), VALID_TASKS_YAML);
      writeFileSync(join(specDir, 'feature.yaml'), 'status:\n  completedPhases: []\n');

      executor = createStubExecutor();
      graph = createFeatureAgentGraph(executor, createCheckpointer(':memory:'));
    },

    cleanup: () => {
      if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    },

    suppressOutput: () => {
      const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
      const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
      return {
        restore: () => {
          stdoutSpy.mockRestore();
          stderrSpy.mockRestore();
        },
      };
    },
  };

  return ctx;
}

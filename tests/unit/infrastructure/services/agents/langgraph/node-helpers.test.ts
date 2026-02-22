/**
 * Node Helpers Unit Tests
 *
 * Tests for the shouldInterrupt function and interrupt logic
 * within the executeNode helper.
 *
 * TDD Phase: RED
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import yaml from 'js-yaml';
import {
  shouldInterrupt,
  safeYamlLoad,
  classifyError,
  retryExecute,
  buildExecutorOptions,
  getCompletedPhases,
  markPhaseComplete,
} from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';
import type {
  IAgentExecutor,
  AgentExecutionResult,
} from '@/application/ports/output/agents/agent-executor.interface.js';
import type { AgentType } from '@/domain/generated/output.js';

describe('safeYamlLoad', () => {
  it('parses valid YAML normally', () => {
    const content = `tasks:\n  - id: task-1\n    title: Do something`;
    const result = safeYamlLoad(content) as { tasks: { id: string; title: string }[] };
    expect(result.tasks[0].id).toBe('task-1');
    expect(result.tasks[0].title).toBe('Do something');
  });

  it('handles list items with unquoted braces', () => {
    const content = `tdd:\n  red:\n    - Assert screen.getByRole('heading', { name: 'Widgets' }) is in the document`;
    const result = safeYamlLoad(content) as { tdd: { red: string[] } };
    expect(result.tdd.red[0]).toContain('getByRole');
    expect(result.tdd.red[0]).toContain('{ name:');
  });

  it('handles multiple list items with braces', () => {
    const content = [
      'steps:',
      '  - Add icon={LayoutDashboard} to sidebar',
      "  - Check active={pathname === '/widgets'}",
      '  - Normal item without braces',
    ].join('\n');
    const result = safeYamlLoad(content) as { steps: string[] };
    expect(result.steps).toHaveLength(3);
    expect(result.steps[0]).toContain('{LayoutDashboard}');
    expect(result.steps[1]).toContain('{pathname');
    expect(result.steps[2]).toBe('Normal item without braces');
  });

  it('does not double-quote already quoted items', () => {
    const content = `items:\n  - "Already quoted { braces }"`;
    const result = safeYamlLoad(content) as { items: string[] };
    expect(result.items[0]).toBe('Already quoted { braces }');
  });

  it('throws on genuinely invalid YAML without braces', () => {
    const content = `bad:\n  - item\n invalid: [`;
    expect(() => safeYamlLoad(content)).toThrow();
  });
});

describe('shouldInterrupt', () => {
  describe('no gates (undefined)', () => {
    it('should never interrupt when gates are undefined', () => {
      const nodes = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const node of nodes) {
        expect(shouldInterrupt(node, undefined)).toBe(false);
      }
    });
  });

  describe('interactive gates (allowPrd=false, allowPlan=false)', () => {
    const gates = { allowPrd: false, allowPlan: false, allowMerge: false };

    it('should NOT interrupt on analyze node', () => {
      expect(shouldInterrupt('analyze', gates)).toBe(false);
    });

    it('should interrupt on requirements node', () => {
      expect(shouldInterrupt('requirements', gates)).toBe(true);
    });

    it('should NOT interrupt on research node', () => {
      expect(shouldInterrupt('research', gates)).toBe(false);
    });

    it('should interrupt on plan node', () => {
      expect(shouldInterrupt('plan', gates)).toBe(true);
    });

    it('should NOT interrupt on implement node', () => {
      expect(shouldInterrupt('implement', gates)).toBe(false);
    });
  });

  describe('allow-prd gates (allowPrd=true, allowPlan=false)', () => {
    const gates = { allowPrd: true, allowPlan: false, allowMerge: false };

    it('should NOT interrupt on analyze node', () => {
      expect(shouldInterrupt('analyze', gates)).toBe(false);
    });

    it('should NOT interrupt on requirements node', () => {
      expect(shouldInterrupt('requirements', gates)).toBe(false);
    });

    it('should NOT interrupt on research node', () => {
      expect(shouldInterrupt('research', gates)).toBe(false);
    });

    it('should interrupt on plan node', () => {
      expect(shouldInterrupt('plan', gates)).toBe(true);
    });

    it('should NOT interrupt on implement node', () => {
      expect(shouldInterrupt('implement', gates)).toBe(false);
    });
  });

  describe('allow-all gates (allowPrd=true, allowPlan=true, allowMerge=true)', () => {
    const gates = { allowPrd: true, allowPlan: true, allowMerge: true };

    it('should never interrupt', () => {
      const nodes = ['analyze', 'requirements', 'research', 'plan', 'implement'];
      for (const node of nodes) {
        expect(shouldInterrupt(node, gates)).toBe(false);
      }
    });
  });
});

describe('classifyError', () => {
  describe('retryable-api errors', () => {
    it('should classify API 400 tool_use.name error as retryable-api', () => {
      const msg =
        'API Error: 400 {"type":"error","error":{"type":"invalid_request_error","message":"messages.1.content.1.tool_use.name: String should have at most 200 characters"}}';
      expect(classifyError(msg)).toBe('retryable-api');
    });

    it('should classify API 429 rate limit as retryable-api', () => {
      expect(classifyError('API Error: 429 rate limit exceeded')).toBe('retryable-api');
    });

    it('should classify API 529 overloaded as retryable-api', () => {
      expect(classifyError('API Error: 529 API is overloaded')).toBe('retryable-api');
    });

    it('should classify API 500 server error as retryable-api', () => {
      expect(classifyError('API Error: 500 internal server error')).toBe('retryable-api');
    });
  });

  describe('retryable-network errors', () => {
    it('should classify ECONNREFUSED as retryable-network', () => {
      expect(classifyError('connect ECONNREFUSED 127.0.0.1:443')).toBe('retryable-network');
    });

    it('should classify ETIMEDOUT as retryable-network', () => {
      expect(classifyError('connect ETIMEDOUT 104.18.6.192:443')).toBe('retryable-network');
    });

    it('should classify ENOTFOUND as retryable-network', () => {
      expect(classifyError('getaddrinfo ENOTFOUND api.anthropic.com')).toBe('retryable-network');
    });

    it('should classify execution timeout as retryable-network', () => {
      expect(classifyError('Agent execution timed out')).toBe('retryable-network');
    });
  });

  describe('non-retryable errors', () => {
    it('should classify generic process exit as non-retryable', () => {
      expect(classifyError('Process exited with code 1')).toBe('non-retryable');
    });

    it('should classify ENOENT as non-retryable', () => {
      expect(classifyError('ENOENT: no such file or directory')).toBe('non-retryable');
    });

    it('should classify SyntaxError as non-retryable', () => {
      expect(classifyError('SyntaxError: Unexpected token')).toBe('non-retryable');
    });
  });

  describe('unknown errors', () => {
    it('should classify unrecognized message as unknown', () => {
      expect(classifyError('Something completely unexpected happened')).toBe('unknown');
    });

    it('should classify empty string as unknown', () => {
      expect(classifyError('')).toBe('unknown');
    });
  });
});

function createMockExecutor(
  executeFn: (prompt: string) => Promise<AgentExecutionResult>
): IAgentExecutor {
  return {
    agentType: 'ClaudeCode' as AgentType,
    execute: vi.fn(executeFn),
    executeStream: vi.fn(),
    supportsFeature: vi.fn(() => false),
  };
}

const SUCCESS_RESULT: AgentExecutionResult = {
  result: 'done',
  sessionId: 'sess-1',
};

describe('retryExecute', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return result on first successful attempt', async () => {
    const executor = createMockExecutor(() => Promise.resolve(SUCCESS_RESULT));
    const result = await retryExecute(executor, 'prompt', { cwd: '/tmp' });
    expect(result).toEqual(SUCCESS_RESULT);
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable-api error and succeed', async () => {
    let attempt = 0;
    const executor = createMockExecutor(() => {
      attempt++;
      if (attempt === 1) return Promise.reject(new Error('API Error: 429 rate limit exceeded'));
      return Promise.resolve(SUCCESS_RESULT);
    });

    const promise = retryExecute(executor, 'prompt', { cwd: '/tmp' }, { baseDelayMs: 100 });
    // Advance past the first retry delay (100ms * 2^0 = 100ms)
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result).toEqual(SUCCESS_RESULT);
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it('should retry on retryable-network error and succeed', async () => {
    let attempt = 0;
    const executor = createMockExecutor(() => {
      attempt++;
      if (attempt === 1) return Promise.reject(new Error('connect ETIMEDOUT 104.18.6.192:443'));
      return Promise.resolve(SUCCESS_RESULT);
    });

    const promise = retryExecute(executor, 'prompt', { cwd: '/tmp' }, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result).toEqual(SUCCESS_RESULT);
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it('should NOT retry on non-retryable error', async () => {
    const executor = createMockExecutor(() =>
      Promise.reject(new Error('Process exited with code 1'))
    );

    await expect(retryExecute(executor, 'prompt', { cwd: '/tmp' })).rejects.toThrow(
      'Process exited with code 1'
    );
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });

  it('should retry unknown errors (treated as retryable)', async () => {
    let attempt = 0;
    const executor = createMockExecutor(() => {
      attempt++;
      if (attempt === 1)
        return Promise.reject(new Error('Something completely unexpected happened'));
      return Promise.resolve(SUCCESS_RESULT);
    });

    const promise = retryExecute(executor, 'prompt', { cwd: '/tmp' }, { baseDelayMs: 100 });
    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result).toEqual(SUCCESS_RESULT);
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it('should fail after max attempts exhausted', async () => {
    const executor = createMockExecutor(() =>
      Promise.reject(new Error('API Error: 500 internal server error'))
    );

    const promise = retryExecute(
      executor,
      'prompt',
      { cwd: '/tmp' },
      { maxAttempts: 3, baseDelayMs: 100 }
    );
    // Capture rejection to avoid unhandled rejection warnings
    const caught = promise.catch((e: unknown) => e);
    // Advance enough time for all retries: 100ms + 200ms
    await vi.advanceTimersByTimeAsync(500);
    const error = await caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('API Error: 500 internal server error');
    expect(executor.execute).toHaveBeenCalledTimes(3);
  });

  it('should use exponential backoff delays (2s, 4s, 8s)', async () => {
    let attempt = 0;
    const executor = createMockExecutor(() => {
      attempt++;
      if (attempt <= 3) return Promise.reject(new Error('API Error: 429 rate limit exceeded'));
      return Promise.resolve(SUCCESS_RESULT);
    });

    const promise = retryExecute(
      executor,
      'prompt',
      { cwd: '/tmp' },
      { maxAttempts: 4, baseDelayMs: 2000 }
    );

    // After first failure, delay = 2000ms (2s * 2^0)
    await vi.advanceTimersByTimeAsync(2000);
    expect(executor.execute).toHaveBeenCalledTimes(2);

    // After second failure, delay = 4000ms (2s * 2^1)
    await vi.advanceTimersByTimeAsync(4000);
    expect(executor.execute).toHaveBeenCalledTimes(3);

    // After third failure, delay = 8000ms (2s * 2^2)
    await vi.advanceTimersByTimeAsync(8000);
    expect(executor.execute).toHaveBeenCalledTimes(4);

    const result = await promise;
    expect(result).toEqual(SUCCESS_RESULT);
  });

  it('should use configurable max attempts', async () => {
    const executor = createMockExecutor(() =>
      Promise.reject(new Error('API Error: 500 internal server error'))
    );

    const promise = retryExecute(
      executor,
      'prompt',
      { cwd: '/tmp' },
      { maxAttempts: 2, baseDelayMs: 100 }
    );
    const caught = promise.catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(300);
    const error = await caught;
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('API Error: 500 internal server error');
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it('should use configurable base delay', async () => {
    let attempt = 0;
    const executor = createMockExecutor(() => {
      attempt++;
      if (attempt === 1) return Promise.reject(new Error('API Error: 429 rate limit exceeded'));
      return Promise.resolve(SUCCESS_RESULT);
    });

    const promise = retryExecute(executor, 'prompt', { cwd: '/tmp' }, { baseDelayMs: 500 });

    // Should not have retried yet at 400ms
    await vi.advanceTimersByTimeAsync(400);
    expect(executor.execute).toHaveBeenCalledTimes(1);

    // Should have retried at 500ms
    await vi.advanceTimersByTimeAsync(200);
    expect(executor.execute).toHaveBeenCalledTimes(2);

    const result = await promise;
    expect(result).toEqual(SUCCESS_RESULT);
  });
});

describe('buildExecutorOptions', () => {
  it('should return cwd from worktreePath when available', () => {
    const state = {
      worktreePath: '/work/tree',
      repositoryPath: '/repo',
    } as FeatureAgentState;
    const result = buildExecutorOptions(state);
    expect(result.cwd).toBe('/work/tree');
  });

  it('should return cwd from repositoryPath when worktreePath is empty', () => {
    const state = {
      worktreePath: '',
      repositoryPath: '/repo',
    } as FeatureAgentState;
    const result = buildExecutorOptions(state);
    expect(result.cwd).toBe('/repo');
  });

  it('should include maxTurns of 50', () => {
    const state = {
      worktreePath: '/work',
      repositoryPath: '/repo',
    } as FeatureAgentState;
    const result = buildExecutorOptions(state);
    expect(result.maxTurns).toBe(50);
  });

  it('should include disableMcp as true', () => {
    const state = {
      worktreePath: '/work',
      repositoryPath: '/repo',
    } as FeatureAgentState;
    const result = buildExecutorOptions(state);
    expect(result.disableMcp).toBe(true);
  });
});

describe('getCompletedPhases', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'node-helpers-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should return empty array when feature.yaml has no completedPhases', () => {
    const featureData = { id: '017', status: { phase: 'implementing' } };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');
    expect(getCompletedPhases(tempDir)).toEqual([]);
  });

  it('should return completedPhases array from feature.yaml', () => {
    const featureData = {
      id: '017',
      status: { phase: 'implementing', completedPhases: ['phase-1', 'phase-2'] },
    };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');
    expect(getCompletedPhases(tempDir)).toEqual(['phase-1', 'phase-2']);
  });

  it('should return empty array when feature.yaml does not exist', () => {
    expect(getCompletedPhases(tempDir)).toEqual([]);
  });

  it('should return empty array when completedPhases is not an array', () => {
    const featureData = {
      id: '017',
      status: { completedPhases: 'not-an-array' },
    };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');
    expect(getCompletedPhases(tempDir)).toEqual([]);
  });
});

describe('markPhaseComplete', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'node-helpers-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should add phaseId to completedPhases in feature.yaml', () => {
    const featureData = { id: '017', status: { phase: 'implementing' } };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');

    markPhaseComplete(tempDir, 'phase-1');

    const updated = yaml.load(readFileSync(join(tempDir, 'feature.yaml'), 'utf-8')) as Record<
      string,
      unknown
    >;
    const status = updated.status as Record<string, unknown>;
    expect(status.completedPhases).toEqual(['phase-1']);
  });

  it('should not duplicate phaseId if already present', () => {
    const featureData = {
      id: '017',
      status: { phase: 'implementing', completedPhases: ['phase-1'] },
    };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');

    markPhaseComplete(tempDir, 'phase-1');

    const updated = yaml.load(readFileSync(join(tempDir, 'feature.yaml'), 'utf-8')) as Record<
      string,
      unknown
    >;
    const status = updated.status as Record<string, unknown>;
    expect(status.completedPhases).toEqual(['phase-1']);
  });

  it('should append to existing completedPhases', () => {
    const featureData = {
      id: '017',
      status: { completedPhases: ['phase-1'] },
    };
    writeFileSync(join(tempDir, 'feature.yaml'), yaml.dump(featureData), 'utf-8');

    markPhaseComplete(tempDir, 'phase-2');

    const updated = yaml.load(readFileSync(join(tempDir, 'feature.yaml'), 'utf-8')) as Record<
      string,
      unknown
    >;
    const status = updated.status as Record<string, unknown>;
    expect(status.completedPhases).toEqual(['phase-1', 'phase-2']);
  });

  it('should not throw when feature.yaml does not exist', () => {
    expect(() => markPhaseComplete(tempDir, 'phase-1')).not.toThrow();
  });
});

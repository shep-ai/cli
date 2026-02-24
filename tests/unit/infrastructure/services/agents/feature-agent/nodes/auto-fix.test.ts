import { describe, it, expect, vi, beforeEach } from 'vitest';

// The module under test — will be created in the GREEN phase
import {
  classifyNodeError,
  buildNodeFixPrompt,
  withAutoFix,
} from '../../../../../../../packages/core/src/infrastructure/services/agents/feature-agent/nodes/auto-fix.js';
import type { FeatureAgentState } from '../../../../../../../packages/core/src/infrastructure/services/agents/feature-agent/state.js';
import type { IAgentExecutor } from '../../../../../../../packages/core/src/application/ports/output/agents/agent-executor.interface.js';

// Suppress node logger output in tests
vi.mock(
  '../../../../../../../packages/core/src/infrastructure/services/agents/feature-agent/nodes/node-helpers.js',
  () => ({
    createNodeLogger: () => ({
      info: vi.fn(),
      error: vi.fn(),
    }),
    buildExecutorOptions: (state: { worktreePath?: string; repositoryPath?: string }) => ({
      cwd: state.worktreePath ?? state.repositoryPath,
      maxTurns: 50,
      disableMcp: true,
    }),
  })
);

function makeState(overrides?: Partial<FeatureAgentState>): FeatureAgentState {
  return {
    featureId: 'test-feature',
    repositoryPath: '/repo',
    worktreePath: '/repo/wt',
    specDir: '/repo/specs/test',
    currentNode: 'analyze',
    error: null,
    messages: [],
    approvalGates: undefined,
    validationRetries: 0,
    lastValidationTarget: '',
    lastValidationErrors: [],
    _approvalAction: null,
    _rejectionFeedback: null,
    _needsReexecution: false,
    prUrl: null,
    prNumber: null,
    commitHash: null,
    ciStatus: null,
    push: false,
    openPr: false,
    ciFixAttempts: 0,
    ciFixHistory: [],
    ciFixStatus: 'idle',
    nodeFixAttempts: 0,
    nodeFixHistory: [],
    nodeFixStatus: 'idle',
    ...overrides,
  } as FeatureAgentState;
}

function makeExecutor(overrides?: Partial<IAgentExecutor>): IAgentExecutor {
  return {
    execute: vi.fn().mockResolvedValue({ result: 'fix applied', aborted: false }),
    ...overrides,
  } as unknown as IAgentExecutor;
}

/* ------------------------------------------------------------------ */
/*  classifyNodeError                                                  */
/* ------------------------------------------------------------------ */

describe('classifyNodeError', () => {
  it('returns non-fixable for isGraphBubbleUp-like errors', () => {
    // We test the string pattern since we can't easily create real LangGraph errors
    expect(classifyNodeError('GraphBubbleUp')).toBe('non-fixable');
  });

  it('returns non-fixable for auth failures', () => {
    expect(classifyNodeError('AUTH_FAILURE: invalid token')).toBe('non-fixable');
    expect(classifyNodeError('Error: EACCES permission denied')).toBe('non-fixable');
  });

  it('returns non-fixable for missing binary (ENOENT)', () => {
    expect(classifyNodeError('spawn claude ENOENT')).toBe('non-fixable');
  });

  it('returns non-fixable for process crashes', () => {
    expect(classifyNodeError('Process exited with code 137')).toBe('non-fixable');
  });

  it('returns fixable for generic errors', () => {
    expect(classifyNodeError('TypeError: Cannot read property x of undefined')).toBe('fixable');
  });

  it('returns fixable for file/syntax errors', () => {
    expect(classifyNodeError('SyntaxError: Unexpected token')).toBe('fixable');
  });

  it('returns fixable for unknown errors', () => {
    expect(classifyNodeError('Something went wrong')).toBe('fixable');
  });
});

/* ------------------------------------------------------------------ */
/*  buildNodeFixPrompt                                                 */
/* ------------------------------------------------------------------ */

describe('buildNodeFixPrompt', () => {
  const state = makeState();

  it('includes node name in prompt', () => {
    const prompt = buildNodeFixPrompt('analyze', 'Some error', state);
    expect(prompt).toContain('analyze');
  });

  it('includes error message in prompt', () => {
    const prompt = buildNodeFixPrompt('plan', 'Missing file: plan.yaml', state);
    expect(prompt).toContain('Missing file: plan.yaml');
  });

  it('includes working directory in prompt', () => {
    const prompt = buildNodeFixPrompt('research', 'Error', state);
    expect(prompt).toContain('/repo/wt');
  });

  it('includes UNFIXABLE instruction in prompt', () => {
    const prompt = buildNodeFixPrompt('requirements', 'Error', state);
    expect(prompt).toContain('UNFIXABLE');
  });

  it('works for different node names', () => {
    for (const name of ['analyze', 'requirements', 'research', 'plan', 'implement']) {
      const prompt = buildNodeFixPrompt(name, 'Error', state);
      expect(prompt).toContain(name);
    }
  });
});

/* ------------------------------------------------------------------ */
/*  withAutoFix                                                        */
/* ------------------------------------------------------------------ */

describe('withAutoFix', () => {
  let executor: IAgentExecutor;

  beforeEach(() => {
    executor = makeExecutor();
  });

  it('passes through result when inner node succeeds', async () => {
    const innerResult: Partial<FeatureAgentState> = {
      currentNode: 'analyze',
      messages: ['done'],
    };
    const innerFn = vi.fn().mockResolvedValue(innerResult);
    const wrapped = withAutoFix('analyze', innerFn, executor, { maxAttempts: 2 });

    const result = await wrapped(makeState());

    expect(innerFn).toHaveBeenCalledOnce();
    expect(result).toEqual(innerResult);
    // executor should NOT be called on success
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('attempts fix when node fails with fixable error', async () => {
    const innerFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('Some fixable error'))
      .mockResolvedValueOnce({ currentNode: 'analyze', messages: ['retry ok'] });

    const wrapped = withAutoFix('analyze', innerFn, executor, { maxAttempts: 2 });
    const result = await wrapped(makeState());

    // executor.execute called with fix prompt
    expect(executor.execute).toHaveBeenCalledOnce();
    // inner function retried
    expect(innerFn).toHaveBeenCalledTimes(2);
    // result includes fix tracking
    expect(result.nodeFixAttempts).toBe(1);
    expect(result.nodeFixHistory).toHaveLength(1);
    expect(result.nodeFixHistory![0].outcome).toBe('fixed');
    expect(result.nodeFixStatus).toBe('success');
  });

  it('retries up to maxAttempts then rethrows', async () => {
    const error = new Error('Persistent failure');
    const innerFn = vi.fn().mockRejectedValue(error);

    const wrapped = withAutoFix('plan', innerFn, executor, { maxAttempts: 2 });

    await expect(wrapped(makeState())).rejects.toThrow('Persistent failure');

    // inner called: 1 initial + 2 retries = 3
    expect(innerFn).toHaveBeenCalledTimes(3);
    // executor called for each fix attempt
    expect(executor.execute).toHaveBeenCalledTimes(2);
  });

  it('rethrows non-fixable errors immediately without fix attempt', async () => {
    const error = new Error('AUTH_FAILURE: bad credentials');
    const innerFn = vi.fn().mockRejectedValue(error);

    const wrapped = withAutoFix('analyze', innerFn, executor, { maxAttempts: 2 });

    await expect(wrapped(makeState())).rejects.toThrow('AUTH_FAILURE');
    expect(innerFn).toHaveBeenCalledOnce();
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('rethrows when executor response starts with UNFIXABLE', async () => {
    const innerFn = vi.fn().mockRejectedValue(new Error('Broken thing'));
    (executor.execute as ReturnType<typeof vi.fn>).mockResolvedValue({
      result: 'UNFIXABLE: Cannot resolve this issue because the API key is invalid',
      aborted: false,
    });

    const wrapped = withAutoFix('research', innerFn, executor, { maxAttempts: 2 });

    await expect(wrapped(makeState())).rejects.toThrow('Broken thing');
    // inner called once (initial), executor called once (fix attempt), but no retry
    expect(innerFn).toHaveBeenCalledOnce();
    expect(executor.execute).toHaveBeenCalledOnce();
  });

  it('records fix history with correct fields', async () => {
    const innerFn = vi
      .fn()
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce({ currentNode: 'plan', messages: ['ok'] });

    const wrapped = withAutoFix('plan', innerFn, executor, { maxAttempts: 2 });
    const result = await wrapped(makeState());

    expect(result.nodeFixHistory).toHaveLength(1);
    const record = result.nodeFixHistory![0];
    expect(record.attempt).toBe(1);
    expect(record.nodeName).toBe('plan');
    expect(record.errorSummary).toContain('First error');
    expect(record.startedAt).toBeTruthy();
    expect(record.outcome).toBe('fixed');
  });

  it('always rethrows LangGraph bubble-up errors', async () => {
    // Simulate a GraphBubbleUp error
    const graphError = new Error('GraphBubbleUp');
    Object.defineProperty(graphError, 'lc_error_code', { value: 'GRAPH_BUBBLE_UP' });

    const innerFn = vi.fn().mockRejectedValue(graphError);
    const wrapped = withAutoFix('analyze', innerFn, executor, { maxAttempts: 2 });

    await expect(wrapped(makeState())).rejects.toThrow('GraphBubbleUp');
    expect(innerFn).toHaveBeenCalledOnce();
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('records exhausted status when all attempts fail', async () => {
    const innerFn = vi.fn().mockRejectedValue(new Error('Keeps failing'));
    const wrapped = withAutoFix('analyze', innerFn, executor, { maxAttempts: 1 });

    try {
      await wrapped(makeState());
    } catch {
      // expected
    }

    // With maxAttempts=1: 1 initial + 1 fix attempt + 1 retry = innerFn called 2 times
    expect(innerFn).toHaveBeenCalledTimes(2);
    expect(executor.execute).toHaveBeenCalledTimes(1);
  });
});

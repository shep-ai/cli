import { vi } from 'vitest';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';

/** Fake PR URL used by all PR-path tests. Intercepted by makeSelectiveExec. */
export const FAKE_PR_URL = 'https://github.com/test/repo/pull/42';

/**
 * Creates a mock IAgentExecutor that returns the given output string.
 * The output should contain a realistic commit hash line and, for PR-path
 * tests, a fake GitHub PR URL — these are parsed by parseCommitHash() and
 * parsePrUrl() in the merge node.
 */
export function makeMockExecutor(output: string): IAgentExecutor {
  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockResolvedValue({ result: output }),
    executeStream: vi.fn() as IAgentExecutor['executeStream'],
    supportsFeature: vi.fn().mockReturnValue(false),
  } as IAgentExecutor;
}

import { vi } from 'vitest';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  IAgentExecutor,
  AgentExecutionOptions,
} from '@/application/ports/output/agents/agent-executor.interface.js';

const execFileAsync = promisify(execFileCb);

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

/**
 * Creates an IAgentExecutor that runs real git commands based on the prompt.
 *
 * Detects the agent call type by matching prompt keywords and executes
 * the corresponding git operations:
 * - Call 1 (commit/push/PR): stages + commits on the feature branch
 * - Call 2 (merge/squash): squash-merges the feature branch into base
 *
 * Used by local-merge and push-merge integration tests to verify real
 * git state after the merge node completes.
 */
export function makeGitExecutor(featureBranch: string): IAgentExecutor {
  const git = (args: string[], cwd: string) =>
    execFileAsync('git', args, { cwd }) as Promise<{ stdout: string; stderr: string }>;

  return {
    agentType: 'claude-code' as never,
    execute: vi.fn().mockImplementation(async (prompt: string, options?: AgentExecutionOptions) => {
      const cwd = options?.cwd ?? '';

      if (prompt.includes('git operations in a feature worktree')) {
        // Call 1: commit on the feature branch (may already be committed)
        const { stdout: status } = await git(['status', '--porcelain'], cwd);
        if (status.trim()) {
          await git(['add', '-A'], cwd);
          await git(['commit', '-m', 'feat: test implementation'], cwd);
        }
        return { result: '[feat/test abc1234] feat: test implementation' };
      }

      if (prompt.includes('local merge in the original repository')) {
        // Call 2: squash merge into base branch
        // Fetch from remote if available (ignore errors for local-only repos)
        try {
          await git(['fetch', 'origin'], cwd);
        } catch {
          // No remote — expected for local-only repos
        }
        await git(['checkout', 'main'], cwd);
        try {
          await git(['pull', 'origin', 'main'], cwd);
        } catch {
          // No remote — expected for local-only repos
        }
        await git(['merge', '--squash', featureBranch], cwd);
        await git(['commit', '-m', 'feat: squash merge feature'], cwd);
        // Do NOT delete the feature branch — verifyMerge needs it to exist
        // for diff comparison. The real agent prompt says to delete, but
        // git branch -d after squash merge may succeed when the branch has
        // been pushed to a remote, removing the ref before verification.
        return { result: '[main def5678] feat: squash merge feature' };
      }

      return { result: 'unknown prompt' };
    }),
    executeStream: vi.fn() as IAgentExecutor['executeStream'],
    supportsFeature: vi.fn().mockReturnValue(false),
  } as IAgentExecutor;
}

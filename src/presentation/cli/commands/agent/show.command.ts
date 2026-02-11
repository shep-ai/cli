/**
 * Agent Run Show Command
 *
 * Displays detailed information about a specific agent run.
 *
 * Usage: shep agent show <id>
 *
 * @example
 * $ shep agent show abcd1234
 */

import { Command } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import { ShowAgentRunUseCase } from '../../../../application/use-cases/agents/show-agent-run.use-case.js';
import { colors, fmt, messages } from '../../ui/index.js';

/**
 * Create the agent show command
 */
export function createShowCommand(): Command {
  return new Command('show')
    .description('Show agent run details')
    .argument('<id>', 'Agent run ID (or prefix)')
    .action(async (runId: string) => {
      try {
        const useCase = container.resolve(ShowAgentRunUseCase);
        const { run, isAlive } = await useCase.execute(runId);

        messages.newline();
        console.log(fmt.heading(`Agent Run: ${run.agentName}`));
        messages.newline();

        console.log(`  ${colors.muted('ID:')}            ${run.id}`);
        console.log(`  ${colors.muted('Agent Type:')}    ${run.agentType}`);
        console.log(`  ${colors.muted('Agent Name:')}    ${run.agentName}`);
        console.log(`  ${colors.muted('Status:')}        ${run.status}`);
        console.log(`  ${colors.muted('Thread ID:')}     ${run.threadId}`);

        if (run.featureId) {
          console.log(`  ${colors.muted('Feature ID:')}    ${run.featureId}`);
        }
        if (run.repositoryPath) {
          console.log(`  ${colors.muted('Repository:')}    ${run.repositoryPath}`);
        }
        if (run.pid != null) {
          const aliveLabel = isAlive ? colors.success('alive') : colors.error('dead');
          console.log(`  ${colors.muted('PID:')}           ${run.pid} (${aliveLabel})`);
        }
        if (run.sessionId) {
          console.log(`  ${colors.muted('Session ID:')}    ${run.sessionId}`);
        }

        // Timestamps
        messages.newline();
        const created =
          run.createdAt instanceof Date ? run.createdAt.toLocaleString() : String(run.createdAt);
        console.log(`  ${colors.muted('Created:')}       ${created}`);

        if (run.startedAt) {
          const started =
            run.startedAt instanceof Date ? run.startedAt.toLocaleString() : String(run.startedAt);
          console.log(`  ${colors.muted('Started:')}       ${started}`);
        }
        if (run.completedAt) {
          const completed =
            run.completedAt instanceof Date
              ? run.completedAt.toLocaleString()
              : String(run.completedAt);
          console.log(`  ${colors.muted('Completed:')}     ${completed}`);
        }

        // Prompt
        messages.newline();
        console.log(`  ${colors.muted('Prompt:')}`);
        console.log(`    ${run.prompt.slice(0, 200)}`);

        // Result or Error
        if (run.result) {
          messages.newline();
          console.log(`  ${colors.muted('Result:')}`);
          console.log(`    ${run.result.slice(0, 200)}`);
        }
        if (run.error) {
          messages.newline();
          console.log(`  ${colors.error('Error:')}`);
          console.log(`    ${run.error}`);
        }

        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show agent run', err);
        process.exitCode = 1;
      }
    });
}

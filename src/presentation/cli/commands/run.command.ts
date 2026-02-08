/**
 * Run Command
 *
 * Runs an AI agent workflow against a repository.
 *
 * Usage: shep run <agent-name> [options]
 *
 * @example
 * $ shep run analyze-repository
 * $ shep run analyze-repository --prompt "Focus on security"
 * $ shep run analyze-repository --repo /path/to/repo
 */

import { Command } from 'commander';
import { container } from '../../../infrastructure/di/container.js';
import { RunAgentUseCase } from '../../../application/use-cases/agents/run-agent.use-case.js';
import { colors, fmt, messages } from '../ui/index.js';

/**
 * Create the run command
 */
export function createRunCommand(): Command {
  return new Command('run')
    .description('Run an AI agent workflow')
    .argument('<agent-name>', 'Name of the agent to run (e.g., analyze-repository)')
    .option('-p, --prompt <prompt>', 'Prompt to send to the agent', 'Analyze this repository')
    .option('-r, --repo <path>', 'Repository path (defaults to current directory)')
    .action(async (agentName: string, options: { prompt: string; repo?: string }) => {
      try {
        const useCase = container.resolve(RunAgentUseCase);

        messages.newline();
        console.log(`${fmt.heading('Running agent:')} ${colors.accent(agentName)}`);
        messages.newline();

        const run = await useCase.execute({
          agentName,
          prompt: options.prompt,
          options: {
            repositoryPath: options.repo ?? process.cwd(),
          },
        });

        if (run.status === 'completed') {
          console.log(fmt.heading('Result:'));
          messages.newline();
          console.log(run.result ?? 'No output');
        } else if (run.status === 'failed') {
          messages.error('Agent execution failed', new Error(run.error ?? 'Unknown error'));
          process.exitCode = 1;
        }
        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to run agent', err);
        process.exitCode = 1;
      }
    });
}

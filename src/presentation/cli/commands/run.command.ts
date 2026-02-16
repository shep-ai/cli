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
 * $ shep run analyze-repository --stream
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { RunAgentUseCase } from '@/application/use-cases/agents/run-agent.use-case.js';
import { colors, symbols, fmt, messages } from '../ui/index.js';

/**
 * Creates a terminal spinner that shows progress while awaiting an async operation.
 * Returns start/stop controls. The spinner writes to stderr to avoid polluting stdout.
 */
function createSpinner(text: string) {
  const frames = symbols.spinner;
  let frameIndex = 0;
  let intervalId: ReturnType<typeof setInterval> | undefined;

  return {
    start() {
      process.stderr.write(`${colors.info(frames[0])} ${text}`);
      intervalId = setInterval(() => {
        frameIndex = (frameIndex + 1) % frames.length;
        process.stderr.write(`\r${colors.info(frames[frameIndex])} ${text}`);
      }, 80);
    },
    stop() {
      if (intervalId) clearInterval(intervalId);
      process.stderr.write(`\r${' '.repeat(text.length + 4)}\r`);
    },
  };
}

interface RunOptions {
  prompt: string;
  repo?: string;
  stream?: boolean;
}

/**
 * Create the run command
 */
export function createRunCommand(): Command {
  return new Command('run')
    .description('Run an AI agent workflow')
    .argument('<agent-name>', 'Name of the agent to run (e.g., analyze-repository)')
    .option('-p, --prompt <prompt>', 'Prompt to send to the agent', 'Analyze this repository')
    .option('-r, --repo <path>', 'Repository path (defaults to current directory)')
    .option('-s, --stream', 'Stream output in real-time')
    .action(async (agentName: string, options: RunOptions) => {
      try {
        const useCase = container.resolve(RunAgentUseCase);
        const repoPath = options.repo ?? process.cwd();

        messages.newline();
        console.log(`${fmt.heading('Running agent:')} ${colors.accent(agentName)}`);
        console.log(colors.muted(`  Repository: ${repoPath}`));
        console.log(colors.muted(`  Prompt: ${options.prompt}`));
        messages.newline();

        if (options.stream) {
          await runStreaming(useCase, agentName, options.prompt, repoPath);
        } else {
          await runBlocking(useCase, agentName, options.prompt, repoPath);
        }

        messages.newline();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to run agent', err);
        process.exitCode = 1;
      }
    });
}

/** Stream agent events to stdout in real-time. */
async function runStreaming(
  useCase: RunAgentUseCase,
  agentName: string,
  prompt: string,
  repoPath: string
): Promise<void> {
  let hasResult = false;

  for await (const event of useCase.executeStream({
    agentName,
    prompt,
    options: { repositoryPath: repoPath },
  })) {
    if (event.type === 'progress') {
      process.stdout.write(event.content);
    } else if (event.type === 'result') {
      hasResult = true;
      messages.newline();
      messages.success(`Agent ${agentName} completed`);
      messages.newline();
      console.log(fmt.heading('Result:'));
      messages.newline();
      console.log(event.content);
    } else if (event.type === 'error') {
      messages.error(event.content);
      process.exitCode = 1;
    }
  }

  if (!hasResult) {
    messages.success(`Agent ${agentName} completed`);
  }
}

/** Run agent with spinner (blocking mode). */
async function runBlocking(
  useCase: RunAgentUseCase,
  agentName: string,
  prompt: string,
  repoPath: string
): Promise<void> {
  const spinner = createSpinner(`Agent ${agentName} is working...`);
  spinner.start();

  let run;
  try {
    run = await useCase.execute({
      agentName,
      prompt,
      options: { repositoryPath: repoPath },
    });
  } finally {
    spinner.stop();
  }

  if (run.status === 'completed') {
    messages.success(`Agent ${agentName} completed`);
    messages.newline();
    console.log(fmt.heading('Result:'));
    messages.newline();
    console.log(run.result ?? 'No output');
  } else if (run.status === 'failed') {
    messages.error('Agent execution failed', new Error(run.error ?? 'Unknown error'));
    process.exitCode = 1;
  }
}

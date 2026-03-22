/**
 * Feature New Command
 *
 * Creates a new feature with a git branch and worktree.
 *
 * Usage: shep feat new <description> [options]
 *
 * @example
 * $ shep feat new "Add user authentication"
 * $ shep feat new "Add login page" --repo /path/to/project
 * $ shep feat new "Add dark mode" --remote owner/repo
 */

import { Command, Option } from 'commander';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { container } from '@/infrastructure/di/container.js';
import { CreateFeatureUseCase } from '@/application/use-cases/features/create/create-feature.use-case.js';
import { CreateFeatureFromRemoteUseCase } from '@/application/use-cases/features/create/create-feature-from-remote.use-case.js';
import type { ApprovalGates } from '@/domain/generated/output.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import {
  GitHubAuthError,
  GitHubCloneError,
  GitHubForkError,
  GitHubUrlParseError,
} from '@/application/ports/output/services/github-repository-service.interface.js';
import type { IRepositoryRepository } from '@/application/ports/output/repositories/repository-repository.interface.js';
import { colors, messages, symbols, spinner } from '../../ui/index.js';
import { getShepHomeDir } from '@/infrastructure/services/filesystem/shep-directory.service.js';
import { getSettings, hasSettings } from '@/infrastructure/services/settings.service.js';
import { CheckOnboardingStatusUseCase } from '@/application/use-cases/settings/check-onboarding-status.use-case.js';
import { onboardingWizard } from '../../../tui/wizards/onboarding/onboarding.wizard.js';

interface NewOptions {
  repo?: string;
  remote?: string;
  push?: boolean;
  pr?: boolean;
  allowPrd?: boolean;
  allowPlan?: boolean;
  allowMerge?: boolean;
  allowAll?: boolean;
  parent?: string;
  fast?: boolean;
  pending?: boolean;
  model?: string;
  attach?: string[];
}

/** Commander collect pattern for repeatable options. */
function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

/**
 * Read workflow defaults from settings, falling back to false if settings unavailable.
 */
interface WorkflowDefaults {
  openPr: boolean;
  allowPrd: boolean;
  allowPlan: boolean;
  allowMerge: boolean;
  push: boolean;
}

function getWorkflowDefaults(): WorkflowDefaults {
  if (!hasSettings()) {
    return { openPr: false, allowPrd: false, allowPlan: false, allowMerge: false, push: false };
  }
  const settings = getSettings();
  const gates = settings.workflow.approvalGateDefaults;
  return {
    openPr: settings.workflow.openPrOnImplementationComplete,
    allowPrd: gates.allowPrd,
    allowPlan: gates.allowPlan,
    allowMerge: gates.allowMerge,
    push: gates.pushOnImplementationComplete,
  };
}

/**
 * Create the feat new command
 */
export function createNewCommand(): Command {
  return new Command('new')
    .description('Create a new feature')
    .argument('<description>', 'Feature description')
    .option('-r, --repo <path>', 'Repository path (defaults to current directory)')
    .addOption(
      new Option(
        '--remote <url>',
        'GitHub URL or owner/repo shorthand to clone and create feature on'
      ).conflicts('repo')
    )
    .option('--push', 'Push branch to remote after implementation')
    .option('--pr', 'Open PR on implementation complete (implies --push)')
    .option('--no-pr', 'Do not open PR on implementation complete')
    .option('--allow-prd', 'Auto-approve through requirements, pause after')
    .option('--allow-plan', 'Auto-approve through planning, pause at implementation')
    .option('--allow-merge', 'Auto-approve merge phase')
    .option('--allow-all', 'Run fully autonomous (no approval pauses)')
    .option('--parent <fid>', 'Parent feature ID (full or partial prefix)')
    .option('--pending', 'Create feature without starting the agent')
    .option('--fast', 'Skip SDLC phases and implement directly from your prompt')
    .option('--model <model>', 'LLM model identifier for this run (e.g. claude-opus-4-6)')
    .option('--attach <path>', 'Attach a file (repeatable)', collect, [])
    .action(async (description: string, options: NewOptions) => {
      try {
        // First-run onboarding gate — only for interactive terminals
        if (process.stdin.isTTY) {
          const { isComplete } = await new CheckOnboardingStatusUseCase().execute();
          if (!isComplete) {
            await onboardingWizard();
          }
        }

        // Resolve openPr from CLI flags or settings defaults
        const defaults = getWorkflowDefaults();
        const openPr = options.pr ?? defaults.openPr;

        // Build approval gates from flags, falling back to settings defaults
        const approvalGates: ApprovalGates = options.allowAll
          ? { allowPrd: true, allowPlan: true, allowMerge: true }
          : {
              allowPrd: options.allowPrd ?? defaults.allowPrd,
              allowPlan: options.allowPlan ?? defaults.allowPlan,
              allowMerge: options.allowMerge ?? defaults.allowMerge,
            };

        const push = options.push ?? defaults.push;

        // Resolve parent feature ID if --parent flag is provided
        let parentId: string | undefined;
        if (options.parent) {
          const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
          const parentFeature = await featureRepo.findByIdPrefix(options.parent);
          if (!parentFeature) {
            messages.error(`Parent feature not found: ${options.parent}`);
            process.exitCode = 1;
            return;
          }
          parentId = parentFeature.id;
        }

        // Validate --attach paths
        const attachmentPaths: string[] = [];
        if (options.attach && options.attach.length > 0) {
          for (const raw of options.attach) {
            const resolved = resolve(raw);
            if (!existsSync(resolved)) {
              messages.error(`Attachment not found: ${resolved}`);
              process.exitCode = 1;
              return;
            }
            attachmentPaths.push(resolved);
          }
        }

        // Common input fields shared between local and remote paths
        const commonInput = {
          userInput: description,
          approvalGates,
          push,
          openPr,
          ...(parentId !== undefined && { parentId }),
          ...(options.pending && { pending: true }),
          ...(options.fast && { fast: true }),
          ...(options.model !== undefined && { model: options.model }),
          ...(attachmentPaths.length > 0 && { attachmentPaths }),
        };

        let result;

        if (options.remote) {
          // Remote flow: import GitHub repo then create feature
          const remoteUseCase = container.resolve(CreateFeatureFromRemoteUseCase);

          // Read defaultCloneDir from settings
          const settings = getSettings();
          const defaultCloneDir = settings.environment?.defaultCloneDirectory;

          // Dynamic spinner with clone progress updates
          const frames = symbols.spinner;
          let frameIdx = 0;
          let spinnerLabel = 'Cloning repository';
          let maxLabelLen = spinnerLabel.length;

          const writeSpinner = () => {
            const frame = frames[frameIdx % frames.length];
            process.stderr.write(`\r${colors.muted(`${frame} ${spinnerLabel}...`)}`);
            frameIdx++;
          };

          writeSpinner();
          const spinnerInterval = setInterval(writeSpinner, 80);

          const clearSpinner = () => {
            clearInterval(spinnerInterval);
            process.stderr.write(`\r${' '.repeat(maxLabelLen + 6)}\r`);
          };

          try {
            result = await remoteUseCase.execute({
              ...commonInput,
              remoteUrl: options.remote!,
              ...(defaultCloneDir !== undefined && { defaultCloneDir }),
              cloneOptions: {
                onProgress: (data: string) => {
                  // Parse clone progress from gh CLI stderr
                  const progressMatch = data.match(
                    /(?:Cloning|Receiving objects|Resolving deltas|Updating files)[^]*?(?:\d+%|\.{3})/
                  );
                  if (progressMatch) {
                    const line = progressMatch[0].split('\n')[0].trim();
                    if (line.length > 0) {
                      spinnerLabel = line;
                      if (spinnerLabel.length > maxLabelLen) {
                        maxLabelLen = spinnerLabel.length;
                      }
                    }
                  }
                },
              },
              forkOptions: {
                onProgress: (data: string) => {
                  const line = data.trim().split('\n')[0];
                  if (line.length > 0) {
                    spinnerLabel = `Forking: ${line}`;
                    if (spinnerLabel.length > maxLabelLen) {
                      maxLabelLen = spinnerLabel.length;
                    }
                  }
                },
              },
            });
            clearSpinner();
          } catch (error) {
            clearSpinner();
            throw error;
          }
        } else {
          // Local flow: use existing repository
          const useCase = container.resolve(CreateFeatureUseCase);
          const repoPath = options.repo ?? process.cwd();

          result = await spinner('Thinking', () =>
            useCase.execute({
              ...commonInput,
              repositoryPath: repoPath,
            })
          );
        }

        const { feature, warning } = result;
        const repoPath = options.remote ? feature.repositoryPath : (options.repo ?? process.cwd());
        const repoHash = createHash('sha256').update(repoPath).digest('hex').slice(0, 16);
        const wtSlug = feature.branch.replace(/\//g, '-');
        const worktreePath = join(getShepHomeDir(), 'repos', repoHash, 'wt', wtSlug);

        messages.newline();
        if (warning) {
          messages.warning(warning);
        }
        messages.success('Feature created');
        if (feature.lifecycle === SdlcLifecycle.Blocked) {
          messages.info(
            `Feature created in Blocked state — waiting for parent to reach Implementation`
          );
        }
        if (feature.lifecycle === SdlcLifecycle.Pending) {
          messages.info(
            `Feature created in Pending state — run ${colors.accent(`shep feat start ${feature.id.slice(0, 8)}`)} to begin`
          );
        }
        console.log(`  ${colors.muted('ID:')}       ${colors.accent(feature.id)}`);
        console.log(`  ${colors.muted('Name:')}     ${feature.name}`);
        console.log(`  ${colors.muted('Branch:')}   ${colors.accent(feature.branch)}`);
        console.log(`  ${colors.muted('Status:')}   ${feature.lifecycle}`);
        console.log(`  ${colors.muted('Worktree:')} ${worktreePath}`);
        if (options.remote && feature.repositoryId) {
          const repoRepo = container.resolve<IRepositoryRepository>('IRepositoryRepository');
          const repo = await repoRepo.findById(feature.repositoryId);
          if (repo?.isFork && repo.upstreamUrl) {
            const upstreamShort = repo.upstreamUrl.replace('https://github.com/', '');
            console.log(
              `  ${colors.muted('Fork:')}     ${colors.accent('yes')} (upstream: ${upstreamShort})`
            );
          }
        }
        if (feature.specPath) {
          console.log(`  ${colors.muted('Spec:')}     ${feature.specPath}`);
        }
        if (feature.agentRunId) {
          const agentStatus =
            feature.lifecycle === SdlcLifecycle.Pending
              ? colors.muted('pending')
              : colors.success('spawned');
          console.log(
            `  ${colors.muted('Agent:')}    ${agentStatus} (run ${feature.agentRunId.slice(0, 8)})`
          );
        }
        if (push || openPr) {
          const pushHint = openPr ? 'push + PR' : 'push only';
          console.log(`  ${colors.muted('Push:')}     ${pushHint}`);
        }
        const approved = [
          approvalGates.allowPrd && 'PRD',
          approvalGates.allowPlan && 'Plan',
          approvalGates.allowMerge && 'Merge',
        ].filter(Boolean);
        const hint =
          approved.length === 3
            ? 'fully autonomous'
            : approved.length === 0
              ? 'pause after every phase'
              : `auto-approve: ${approved.join(', ')}`;
        console.log(`  ${colors.muted('Review:')}   ${hint}`);
        messages.newline();
      } catch (error) {
        // Handle GitHub-specific errors with actionable messages
        if (error instanceof GitHubAuthError) {
          messages.error('GitHub CLI is not authenticated. Run `gh auth login` to sign in.');
          process.exitCode = 1;
          return;
        }
        if (error instanceof GitHubUrlParseError) {
          messages.error(`Invalid GitHub URL: ${error.message}`);
          messages.info(
            'Supported formats: https://github.com/owner/repo, git@github.com:owner/repo.git, or owner/repo'
          );
          process.exitCode = 1;
          return;
        }
        if (error instanceof GitHubCloneError) {
          messages.error(`Clone failed: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        if (error instanceof GitHubForkError) {
          messages.error(`Fork failed: ${error.message}`);
          process.exitCode = 1;
          return;
        }

        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to create feature', err);
        process.exitCode = 1;
      }
    });
}

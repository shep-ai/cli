/**
 * Feature Triage Command
 *
 * Fetches open issues from a GitHub repo, clusters them by topic using AI,
 * presents clusters for interactive review, and creates a feature for each
 * approved cluster.
 *
 * Usage: shep feat triage [options]
 *
 * @example
 * $ shep feat triage
 * $ shep feat triage --repo owner/repo --label bug --limit 50
 * $ shep feat triage --yes
 */

import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import { TriageIssuesUseCase } from '@/application/use-cases/triage/triage-issues.use-case.js';
import { CreateFeatureUseCase } from '@/application/use-cases/features/create/create-feature.use-case.js';
import type { IssueCluster } from '@/application/use-cases/triage/types.js';
import type { ExternalIssue } from '@/application/ports/output/services/external-issue-fetcher.interface.js';
import {
  IssueFetcherError,
  IssueServiceUnavailableError,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';
import { colors, messages, spinner } from '../../ui/index.js';

interface TriageOptions {
  repo?: string;
  label?: string[];
  limit: string;
  yes?: boolean;
}

type ClusterAction = 'approve' | 'skip' | 'edit';

interface TriageSummary {
  issueCount: number;
  clustersProposed: number;
  clustersApproved: number;
  featuresCreated: { name: string; id: string }[];
  clustersSkipped: string[];
  featureErrors: { clusterName: string; error: string }[];
}

/**
 * Format a cluster's issue list for display.
 */
function formatClusterIssues(cluster: IssueCluster, issues: ExternalIssue[]): string {
  return cluster.issueNumbers
    .map((num) => {
      const issue = issues.find((i) => i.number === num);
      return issue ? `    #${num}: ${issue.title}` : `    #${num}`;
    })
    .join('\n');
}

/**
 * Build the userInput string for CreateFeatureUseCase from a cluster.
 */
function buildFeatureInput(cluster: IssueCluster): string {
  const issueRefs = cluster.issueNumbers.map((n) => `#${n}`).join(', ');
  return `${cluster.description}\n\nIssues: ${issueRefs}`;
}

/**
 * Print the triage summary.
 */
function printSummary(summary: TriageSummary): void {
  messages.newline();
  console.log(colors.brand('Triage Summary'));
  console.log(`  ${colors.muted('Issues fetched:')}    ${summary.issueCount}`);
  console.log(`  ${colors.muted('Clusters proposed:')} ${summary.clustersProposed}`);
  console.log(`  ${colors.muted('Clusters approved:')} ${summary.clustersApproved}`);
  console.log(`  ${colors.muted('Features created:')}  ${summary.featuresCreated.length}`);

  if (summary.featuresCreated.length > 0) {
    messages.newline();
    messages.success('Created features:');
    for (const feat of summary.featuresCreated) {
      console.log(`    ${colors.accent(feat.id)} ${feat.name}`);
    }
  }

  if (summary.clustersSkipped.length > 0) {
    messages.newline();
    messages.info('Skipped clusters:');
    for (const name of summary.clustersSkipped) {
      console.log(`    ${colors.muted(name)}`);
    }
  }

  if (summary.featureErrors.length > 0) {
    messages.newline();
    messages.warning('Failed to create features for:');
    for (const { clusterName, error } of summary.featureErrors) {
      console.log(`    ${colors.error(clusterName)}: ${error}`);
    }
  }

  messages.newline();
}

/**
 * Create the feat triage command
 */
export function createTriageCommand(): Command {
  return new Command('triage')
    .description('Fetch issues, cluster by topic, and create features for each cluster')
    .option('-r, --repo <owner/repo>', 'Target a specific repository')
    .option('-l, --label <label...>', 'Filter issues by label (repeatable)')
    .option('--limit <n>', 'Maximum number of issues to fetch', '100')
    .option('-y, --yes', 'Auto-approve all clusters without interactive review')
    .action(async (options: TriageOptions) => {
      const summary: TriageSummary = {
        issueCount: 0,
        clustersProposed: 0,
        clustersApproved: 0,
        featuresCreated: [],
        clustersSkipped: [],
        featureErrors: [],
      };

      try {
        const triageUseCase = container.resolve(TriageIssuesUseCase);
        const createFeatureUseCase = container.resolve(CreateFeatureUseCase);
        const repositoryPath = options.repo ? process.cwd() : process.cwd();

        // Fetch issues and cluster them
        const result = await spinner('Fetching and clustering issues', () =>
          triageUseCase.execute({
            repositoryPath,
            repo: options.repo,
            labels: options.label,
            limit: parseInt(options.limit, 10),
          })
        );

        summary.issueCount = result.issues.length;
        summary.clustersProposed = result.clusters.length;

        if (result.issues.length === 0) {
          messages.info('No open issues found');
          return;
        }

        if (result.clusters.length === 0) {
          messages.info('No clusters were generated');
          return;
        }

        messages.newline();
        messages.success(
          `Found ${result.issues.length} issues in ${result.clusters.length} clusters`
        );
        messages.newline();

        // Review each cluster
        const approvedClusters: IssueCluster[] = [];

        for (let i = 0; i < result.clusters.length; i++) {
          let cluster = result.clusters[i];

          console.log(colors.brand(`Cluster ${i + 1}/${result.clusters.length}: ${cluster.name}`));
          console.log(`  ${colors.muted('Description:')} ${cluster.description}`);
          console.log(`  ${colors.muted('Issues:')}`);
          console.log(formatClusterIssues(cluster, result.issues));
          messages.newline();

          if (options.yes) {
            approvedClusters.push(cluster);
            messages.info(`Auto-approved: ${cluster.name}`);
            messages.newline();
            continue;
          }

          const action = await select<ClusterAction>({
            message: `What would you like to do with "${cluster.name}"?`,
            choices: [
              { name: 'Approve — create a feature for this cluster', value: 'approve' },
              { name: 'Skip — discard this cluster', value: 'skip' },
              { name: 'Edit — modify name/description before approving', value: 'edit' },
            ],
          });

          if (action === 'skip') {
            summary.clustersSkipped.push(cluster.name);
            messages.newline();
            continue;
          }

          if (action === 'edit') {
            const newName = await input({
              message: 'Cluster name:',
              default: cluster.name,
            });
            const newDescription = await input({
              message: 'Cluster description:',
              default: cluster.description,
            });
            cluster = { ...cluster, name: newName, description: newDescription };
          }

          approvedClusters.push(cluster);
          messages.newline();
        }

        summary.clustersApproved = approvedClusters.length;

        if (approvedClusters.length === 0) {
          messages.info('No clusters approved — no features created');
          return;
        }

        // Create features for approved clusters
        messages.newline();
        messages.info(`Creating ${approvedClusters.length} features...`);
        messages.newline();

        for (const cluster of approvedClusters) {
          try {
            const featureResult = await spinner(`Creating feature: ${cluster.name}`, () =>
              createFeatureUseCase.execute({
                userInput: buildFeatureInput(cluster),
                repositoryPath,
              })
            );
            summary.featuresCreated.push({
              name: featureResult.feature.name,
              id: featureResult.feature.id,
            });
            messages.success(`Created: ${featureResult.feature.name}`);
          } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            summary.featureErrors.push({
              clusterName: cluster.name,
              error: error.message,
            });
            messages.error(`Failed to create feature for "${cluster.name}"`, error);
          }
        }

        printSummary(summary);
      } catch (err) {
        // Handle Ctrl+C gracefully (ExitPromptError from @inquirer/prompts)
        if (
          err &&
          typeof err === 'object' &&
          'name' in err &&
          (err as Error).name === 'ExitPromptError'
        ) {
          messages.newline();
          messages.info('Cancelled');
          return;
        }

        const error = err instanceof Error ? err : new Error(String(err));

        if (error instanceof IssueServiceUnavailableError) {
          messages.error(error.message);
          process.exitCode = 1;
          return;
        }

        if (error instanceof IssueFetcherError) {
          messages.error('Failed to fetch issues', error);
          process.exitCode = 1;
          return;
        }

        messages.error('Triage failed', error);
        process.exitCode = 1;
      }
    });
}

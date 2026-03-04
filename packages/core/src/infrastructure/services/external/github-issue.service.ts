/**
 * GitHub Issue Fetcher Service
 *
 * Fetches GitHub issues using the gh CLI subprocess.
 * Supports owner/repo#number and #number (current repo) formats.
 */

import type {
  IExternalIssueFetcher,
  ExternalIssue,
  ListIssuesOptions,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';
import {
  IssueFetcherError,
  IssueNotFoundError,
  IssueServiceUnavailableError,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';

type ExecFileFn = (
  cmd: string,
  args: string[],
  options?: object
) => Promise<{ stdout: string; stderr?: string }>;

export class GitHubIssueFetcher
  implements Pick<IExternalIssueFetcher, 'fetchGitHubIssue' | 'listIssues'>
{
  constructor(private readonly execFile: ExecFileFn) {}

  async fetchGitHubIssue(ref: string): Promise<ExternalIssue> {
    const { issueNumber, repo } = this.parseRef(ref);
    const args = ['issue', 'view', issueNumber];
    if (repo) {
      args.push('--repo', repo);
    }
    args.push('--json', 'title,body,labels,url');

    try {
      const { stdout } = await this.execFile('gh', args, { timeout: 30_000 });
      const data = JSON.parse(stdout) as {
        title: string;
        body: string | null;
        labels: { name: string }[];
        url: string;
      };

      return {
        title: data.title,
        description: data.body ?? '',
        labels: data.labels.map((l) => l.name),
        url: data.url,
        source: 'github',
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new IssueServiceUnavailableError(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/'
        );
      }

      if (error.message.includes('Could not resolve')) {
        throw new IssueNotFoundError(`GitHub issue ${ref} not found`);
      }

      throw new IssueNotFoundError(`Failed to fetch GitHub issue ${ref}: ${error.message}`);
    }
  }

  async listIssues(options?: ListIssuesOptions): Promise<ExternalIssue[]> {
    const args = [
      'issue',
      'list',
      '--json',
      'number,title,body,labels,url',
      '--state',
      'open',
      '--limit',
      String(options?.limit ?? 100),
    ];

    if (options?.labels) {
      for (const label of options.labels) {
        args.push('--label', label);
      }
    }

    if (options?.repo) {
      args.push('--repo', options.repo);
    }

    try {
      const { stdout } = await this.execFile('gh', args, { timeout: 30_000 });
      const data = JSON.parse(stdout) as {
        number: number;
        title: string;
        body: string | null;
        labels: { name: string }[];
        url: string;
      }[];

      return data.map((item) => ({
        title: item.title,
        description: item.body ?? '',
        labels: item.labels.map((l) => l.name),
        url: item.url,
        source: 'github' as const,
        number: item.number,
      }));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));

      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new IssueServiceUnavailableError(
          'GitHub CLI (gh) is not installed. Install it from https://cli.github.com/'
        );
      }

      throw new IssueFetcherError(`Failed to list GitHub issues: ${error.message}`);
    }
  }

  private parseRef(ref: string): { issueNumber: string; repo?: string } {
    // Format: owner/repo#123
    const fullMatch = ref.match(/^([^#]+)#(\d+)$/);
    if (fullMatch) {
      return { issueNumber: fullMatch[2], repo: fullMatch[1] };
    }

    // Format: #123
    const hashMatch = ref.match(/^#(\d+)$/);
    if (hashMatch) {
      return { issueNumber: hashMatch[1] };
    }

    // Format: plain number
    if (/^\d+$/.test(ref)) {
      return { issueNumber: ref };
    }

    throw new IssueNotFoundError(`Invalid GitHub issue reference: ${ref}`);
  }
}

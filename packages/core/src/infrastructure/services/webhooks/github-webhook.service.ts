import type { ExecFunction } from '../git/worktree.service';
import type { IGitPrService } from '../../../application/ports/output/services/git-pr-service.interface';

export interface GitHubWebhookConfig {
  callbackUrl: string;
  secret: string;
  events: string[];
}

export interface GitHubWebhookSyncResult {
  action: 'created' | 'updated' | 'unchanged' | 'skipped';
  hookId?: number;
  callbackUrl?: string;
}

interface GitHubRepoHook {
  id: number;
  active: boolean;
  events?: string[];
  config?: {
    url?: string;
    content_type?: string;
  };
}

const SHEP_WEBHOOK_MARKER = 'source=shep';

function parseGitHubOwnerRepo(remoteUrl: string | null): { owner: string; repo: string } | null {
  if (!remoteUrl) return null;

  const httpsMatch = remoteUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  return null;
}

export class GitHubWebhookService {
  constructor(
    private readonly execFile: ExecFunction,
    private readonly gitPrService: Pick<IGitPrService, 'getRemoteUrl'>
  ) {}

  async ensureRepositoryWebhook(
    cwd: string,
    config: GitHubWebhookConfig
  ): Promise<GitHubWebhookSyncResult> {
    const remoteUrl = await this.gitPrService.getRemoteUrl(cwd);
    const repo = parseGitHubOwnerRepo(remoteUrl);
    if (!repo) {
      return { action: 'skipped' };
    }

    const hooksPath = `repos/${repo.owner}/${repo.repo}/hooks`;
    const hooks = await this.listHooks(cwd, hooksPath);
    const existing = hooks.find((hook) => hook.config?.url?.includes(SHEP_WEBHOOK_MARKER));

    if (!existing) {
      const created = await this.execFile(
        'gh',
        ['api', hooksPath, '--method', 'POST', ...this.buildMutationArgs(config)],
        { cwd }
      );
      const payload = this.parseHookPayload(created.stdout);
      return {
        action: 'created',
        hookId: payload?.id,
        callbackUrl: config.callbackUrl,
      };
    }

    if (this.isHookUpToDate(existing, config)) {
      return {
        action: 'unchanged',
        hookId: existing.id,
        callbackUrl: config.callbackUrl,
      };
    }

    await this.execFile(
      'gh',
      [
        'api',
        `${hooksPath}/${existing.id}`,
        '--method',
        'PATCH',
        ...this.buildMutationArgs(config),
      ],
      { cwd }
    );
    return {
      action: 'updated',
      hookId: existing.id,
      callbackUrl: config.callbackUrl,
    };
  }

  private async listHooks(cwd: string, hooksPath: string): Promise<GitHubRepoHook[]> {
    const result = await this.execFile('gh', ['api', hooksPath], { cwd });
    return (JSON.parse(result.stdout) as GitHubRepoHook[]) ?? [];
  }

  private buildMutationArgs(config: GitHubWebhookConfig): string[] {
    const args = [
      '-f',
      'name=web',
      '-f',
      'active=true',
      '-f',
      `config[url]=${config.callbackUrl}`,
      '-f',
      'config[content_type]=json',
      '-f',
      `config[secret]=${config.secret}`,
      '-f',
      'config[insecure_ssl]=0',
    ];

    for (const event of config.events) {
      args.push('-f', `events[]=${event}`);
    }

    return args;
  }

  private isHookUpToDate(hook: GitHubRepoHook, config: GitHubWebhookConfig): boolean {
    const actualEvents = [...(hook.events ?? [])].sort();
    const desiredEvents = [...config.events].sort();

    return (
      hook.active === true &&
      hook.config?.url === config.callbackUrl &&
      hook.config?.content_type === 'json' &&
      actualEvents.length === desiredEvents.length &&
      actualEvents.every((event, index) => event === desiredEvents[index])
    );
  }

  private parseHookPayload(stdout: string): GitHubRepoHook | null {
    if (!stdout.trim()) return null;
    return JSON.parse(stdout) as GitHubRepoHook;
  }
}

export { SHEP_WEBHOOK_MARKER };

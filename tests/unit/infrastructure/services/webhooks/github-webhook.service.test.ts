import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubWebhookService } from '@/infrastructure/services/webhooks/github-webhook.service.js';
import type { ExecFunction } from '@/infrastructure/services/git/worktree.service.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';

describe('GitHubWebhookService', () => {
  let execFile: ExecFunction;
  let gitPrService: Pick<IGitPrService, 'getRemoteUrl'>;
  let service: GitHubWebhookService;

  beforeEach(() => {
    execFile = vi.fn();
    gitPrService = {
      getRemoteUrl: vi.fn(async (_cwd: string) => null),
    };
    service = new GitHubWebhookService(execFile, gitPrService);
  });

  it('skips non-GitHub remotes', async () => {
    vi.mocked(gitPrService.getRemoteUrl).mockResolvedValue('https://gitlab.com/org/repo');

    const result = await service.ensureRepositoryWebhook('/repo', {
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });

    expect(result).toEqual({ action: 'skipped' });
    expect(execFile).not.toHaveBeenCalled();
  });

  it('creates a webhook when no Shep-managed hook exists', async () => {
    vi.mocked(gitPrService.getRemoteUrl).mockResolvedValue('https://github.com/org/repo');
    vi.mocked(execFile)
      .mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            id: 1,
            active: true,
            config: { url: 'https://example.com/other' },
            events: ['push'],
          },
        ]),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ id: 99 }),
        stderr: '',
      });

    const result = await service.ensureRepositoryWebhook('/repo', {
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });

    expect(result).toEqual({
      action: 'created',
      hookId: 99,
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
    });
    expect(execFile).toHaveBeenNthCalledWith(1, 'gh', ['api', 'repos/org/repo/hooks'], {
      cwd: '/repo',
    });
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining([
        'api',
        'repos/org/repo/hooks',
        '--method',
        'POST',
        '-f',
        'name=web',
        '-f',
        'active=true',
        '-f',
        'config[content_type]=json',
      ]),
      { cwd: '/repo' }
    );
  });

  it('updates the existing Shep hook when the callback URL changes', async () => {
    vi.mocked(gitPrService.getRemoteUrl).mockResolvedValue('https://github.com/org/repo');
    vi.mocked(execFile)
      .mockResolvedValueOnce({
        stdout: JSON.stringify([
          {
            id: 12,
            active: true,
            config: { url: 'https://old.trycloudflare.com/api/webhooks/github?source=shep' },
            events: ['pull_request'],
          },
        ]),
        stderr: '',
      })
      .mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      });

    const result = await service.ensureRepositoryWebhook('/repo', {
      callbackUrl: 'https://new.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });

    expect(result).toEqual({
      action: 'updated',
      hookId: 12,
      callbackUrl: 'https://new.trycloudflare.com/api/webhooks/github?source=shep',
    });
    expect(execFile).toHaveBeenNthCalledWith(
      2,
      'gh',
      expect.arrayContaining(['api', 'repos/org/repo/hooks/12', '--method', 'PATCH']),
      { cwd: '/repo' }
    );
  });

  it('returns unchanged when the Shep hook already matches', async () => {
    vi.mocked(gitPrService.getRemoteUrl).mockResolvedValue('git@github.com:org/repo.git');
    vi.mocked(execFile).mockResolvedValueOnce({
      stdout: JSON.stringify([
        {
          id: 12,
          active: true,
          config: {
            url: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
            content_type: 'json',
          },
          events: ['check_suite', 'pull_request'],
        },
      ]),
      stderr: '',
    });

    const result = await service.ensureRepositoryWebhook('/repo', {
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });

    expect(result).toEqual({
      action: 'unchanged',
      hookId: 12,
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
    });
    expect(execFile).toHaveBeenCalledTimes(1);
  });
});

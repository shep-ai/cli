// @vitest-environment node

import { createHmac } from 'node:crypto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncRepositoryByGitHubFullName: vi.fn(),
  hasPrSyncWatcher: vi.fn(() => true),
}));

vi.mock('@shepai/core/infrastructure/services/webhooks/webhook-secret.service', () => ({
  getOrCreateGitHubWebhookSecret: vi.fn(() => 'secret'),
}));

vi.mock('@shepai/core/infrastructure/services/pr-sync/pr-sync-watcher.service', () => ({
  hasPrSyncWatcher: mocks.hasPrSyncWatcher,
  getPrSyncWatcher: vi.fn(() => ({
    syncRepositoryByGitHubFullName: mocks.syncRepositoryByGitHubFullName,
  })),
}));

import { POST, dynamic } from '@/app/api/webhooks/github/route';

function sign(body: string): string {
  return `sha256=${createHmac('sha256', 'secret').update(body).digest('hex')}`;
}

describe('POST /api/webhooks/github', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPrSyncWatcher.mockReturnValue(true);
    mocks.syncRepositoryByGitHubFullName.mockResolvedValue(true);
  });

  it('exports dynamic = force-dynamic', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('rejects invalid signatures', async () => {
    const body = JSON.stringify({ repository: { full_name: 'org/repo' } });
    const response = await POST(
      new Request('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': 'sha256=bad',
        },
        body,
      })
    );

    expect(response.status).toBe(401);
    expect(mocks.syncRepositoryByGitHubFullName).not.toHaveBeenCalled();
  });

  it('triggers a targeted repository refresh for valid webhook payloads', async () => {
    const body = JSON.stringify({ repository: { full_name: 'org/repo' } });
    const response = await POST(
      new Request('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': sign(body),
        },
        body,
      })
    );

    expect(response.status).toBe(202);
    expect(mocks.syncRepositoryByGitHubFullName).toHaveBeenCalledWith('org/repo');
    await expect(response.json()).resolves.toEqual({ accepted: true, refreshed: true });
  });

  it('returns 400 for validly signed payloads missing repository.full_name', async () => {
    const body = JSON.stringify({ repository: {} });
    const response = await POST(
      new Request('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': sign(body),
        },
        body,
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.syncRepositoryByGitHubFullName).not.toHaveBeenCalled();
  });

  it('accepts the event without refresh when the watcher is unavailable', async () => {
    mocks.hasPrSyncWatcher.mockReturnValue(false);
    const body = JSON.stringify({ repository: { full_name: 'org/repo' } });
    const response = await POST(
      new Request('http://localhost:3000/api/webhooks/github', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': sign(body),
        },
        body,
      })
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ accepted: true, refreshed: false });
    expect(mocks.syncRepositoryByGitHubFullName).not.toHaveBeenCalled();
  });
});

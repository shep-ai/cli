import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getGitHubWebhookSecretPath,
  getOrCreateGitHubWebhookSecret,
} from '@/infrastructure/services/webhooks/webhook-secret.service.js';

describe('webhook secret service', () => {
  const originalShepHome = process.env.SHEP_HOME;
  let shepHome: string;

  beforeEach(() => {
    shepHome = mkdtempSync(join(tmpdir(), 'shep-webhook-secret-'));
    process.env.SHEP_HOME = shepHome;
  });

  afterEach(() => {
    rmSync(shepHome, { recursive: true, force: true });
    if (originalShepHome === undefined) {
      delete process.env.SHEP_HOME;
    } else {
      process.env.SHEP_HOME = originalShepHome;
    }
  });

  it('creates the GitHub secret inside SHEP_HOME/webhooks', () => {
    const secret = getOrCreateGitHubWebhookSecret();

    expect(secret).toHaveLength(64);
    expect(getGitHubWebhookSecretPath()).toBe(join(shepHome, 'webhooks', 'github.secret'));
  });

  it('reuses the same secret across repeated calls', () => {
    const first = getOrCreateGitHubWebhookSecret();
    const second = getOrCreateGitHubWebhookSecret();

    expect(second).toBe(first);
  });
});

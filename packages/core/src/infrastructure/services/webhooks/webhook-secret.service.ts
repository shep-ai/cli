import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { getShepHomeDir } from '../filesystem/shep-directory.service';

const WEBHOOK_SECRET_DIR = 'webhooks';
const GITHUB_SECRET_FILE = 'github.secret';

export function getGitHubWebhookSecretPath(): string {
  return join(getShepHomeDir(), WEBHOOK_SECRET_DIR, GITHUB_SECRET_FILE);
}

export function getOrCreateGitHubWebhookSecret(): string {
  const secretPath = getGitHubWebhookSecretPath();
  if (existsSync(secretPath)) {
    return readFileSync(secretPath, 'utf8').trim();
  }

  mkdirSync(join(getShepHomeDir(), WEBHOOK_SECRET_DIR), { recursive: true });
  const secret = randomBytes(32).toString('hex');
  writeFileSync(secretPath, `${secret}\n`, { mode: 0o600 });
  return secret;
}

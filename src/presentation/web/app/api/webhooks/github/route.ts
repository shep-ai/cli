import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  getPrSyncWatcher,
  hasPrSyncWatcher,
} from '@shepai/core/infrastructure/services/pr-sync/pr-sync-watcher.service';
import { getOrCreateGitHubWebhookSecret } from '@shepai/core/infrastructure/services/webhooks/webhook-secret.service';

export const dynamic = 'force-dynamic';

function isValidSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false;

  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expected = Buffer.from(`sha256=${digest}`);
  const received = Buffer.from(signatureHeader);

  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const secret = getOrCreateGitHubWebhookSecret();
  const signature = request.headers.get('x-hub-signature-256');

  if (!isValidSignature(rawBody, signature, secret)) {
    return Response.json({ error: 'Invalid GitHub webhook signature' }, { status: 401 });
  }

  let payload: { repository?: { full_name?: string } };
  try {
    payload = JSON.parse(rawBody) as { repository?: { full_name?: string } };
  } catch {
    return Response.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const fullName = payload.repository?.full_name;
  if (!fullName) {
    return Response.json({ error: 'Missing repository.full_name' }, { status: 400 });
  }

  if (!hasPrSyncWatcher()) {
    return Response.json({ accepted: true, refreshed: false }, { status: 202 });
  }

  const refreshed = await getPrSyncWatcher().syncRepositoryByGitHubFullName(fullName);
  return Response.json({ accepted: true, refreshed }, { status: 202 });
}

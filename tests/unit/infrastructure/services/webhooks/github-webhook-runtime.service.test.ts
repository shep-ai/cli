import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { GitHubWebhookRuntimeService } from '@/infrastructure/services/webhooks/github-webhook-runtime.service.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

type GatewayHandler = (
  req: PassThrough & { url?: string; method?: string; headers: Record<string, string> },
  res: any
) => void;

function createFeature(repositoryPath: string) {
  return {
    id: `feat-${repositoryPath}`,
    name: 'Feature',
    userQuery: 'query',
    slug: 'feature',
    description: 'desc',
    repositoryPath,
    branch: 'feat/test',
    lifecycle: SdlcLifecycle.Review,
    messages: [],
    relatedArtifacts: [],
    fast: false,
    push: true,
    openPr: true,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createTunnelProcess(url: string) {
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const handlers = new Map<string, (...args: unknown[]) => void>();

  const proc = {
    stdout,
    stderr,
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      handlers.set(event, handler);
      return proc;
    }),
    off: vi.fn((event: string) => {
      handlers.delete(event);
      return proc;
    }),
    kill: vi.fn(() => {
      const handler = handlers.get('exit');
      handler?.(0);
      return true;
    }),
  };

  setTimeout(() => {
    stderr.write(`INF Quick Tunnel ready: ${url}\n`);
  }, 0);

  return proc;
}

describe('GitHubWebhookRuntimeService', () => {
  const originalEnv = process.env.SHEP_ENABLE_GITHUB_WEBHOOKS;

  beforeEach(() => {
    delete process.env.SHEP_ENABLE_GITHUB_WEBHOOKS;
  });

  afterEach(async () => {
    if (originalEnv === undefined) {
      delete process.env.SHEP_ENABLE_GITHUB_WEBHOOKS;
    } else {
      process.env.SHEP_ENABLE_GITHUB_WEBHOOKS = originalEnv;
    }
  });

  it('does nothing when webhook mode is disabled', async () => {
    const featureRepo = { list: vi.fn() };
    const webhookService = { ensureRepositoryWebhook: vi.fn() };
    const runtime = new GitHubWebhookRuntimeService(
      featureRepo as any,
      webhookService as any,
      4050
    );

    const result = await runtime.start();

    expect(result).toBeNull();
    expect(featureRepo.list).not.toHaveBeenCalled();
    expect(runtime.getGatewayPort()).toBeNull();
  });

  it('forwards only webhook paths through the local gateway', async () => {
    process.env.SHEP_ENABLE_GITHUB_WEBHOOKS = '1';
    const fetchImpl = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    let gatewayHandler: GatewayHandler | null = null;

    const mockServer = {
      once: vi.fn(),
      listen: vi.fn((_port: number, _host: string, cb: () => void) => cb()),
      close: vi.fn((cb: () => void) => cb()),
    };

    const runtime = new GitHubWebhookRuntimeService(
      { list: vi.fn().mockResolvedValue([]) } as any,
      { ensureRepositoryWebhook: vi.fn() } as any,
      4050,
      60_000,
      {
        createServer: vi.fn((handler) => {
          gatewayHandler = handler as any;
          return mockServer as any;
        }),
        findAvailablePort: vi.fn().mockResolvedValue(4591),
        spawnProcess: vi.fn(() => createTunnelProcess('https://demo.trycloudflare.com')) as any,
        getSecret: vi.fn().mockReturnValue('secret'),
        fetchImpl: fetchImpl as any,
      }
    );

    await runtime.start();
    if (!gatewayHandler) {
      throw new Error('Expected gateway handler to be registered');
    }
    const activeGatewayHandler = gatewayHandler as GatewayHandler;

    const blockedReq = new PassThrough() as PassThrough & {
      url?: string;
      method?: string;
      headers: Record<string, string>;
    };
    blockedReq.url = '/';
    blockedReq.method = 'POST';
    blockedReq.headers = {};
    blockedReq.end();
    const blockedRes = {
      statusCode: 200,
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    await activeGatewayHandler(blockedReq, blockedRes);
    expect(blockedRes.statusCode).toBe(404);
    expect(fetchImpl).not.toHaveBeenCalled();

    const webhookReq = new PassThrough() as PassThrough & {
      url?: string;
      method?: string;
      headers: Record<string, string>;
    };
    webhookReq.url = '/api/webhooks/github';
    webhookReq.method = 'POST';
    webhookReq.headers = { 'x-test': '1' };
    webhookReq.end('payload');
    const webhookRes = {
      statusCode: 0,
      setHeader: vi.fn(),
      end: vi.fn(),
    };
    activeGatewayHandler(webhookReq, webhookRes);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [forwardedUrl, forwardedInit] = fetchImpl.mock.calls[0];
    expect(forwardedUrl).toBe('http://127.0.0.1:4050/api/webhooks/github');
    expect(forwardedInit).toMatchObject({
      method: 'POST',
      headers: expect.any(Headers),
    });
    expect(forwardedInit?.body).toBeInstanceOf(Uint8Array);
    expect(Buffer.from(forwardedInit.body as Uint8Array)).toEqual(Buffer.from('payload'));
    expect(webhookRes.statusCode).toBe(200);
    expect(webhookRes.end).toHaveBeenCalledWith(Buffer.from('ok'));

    await runtime.stop();
  });

  it('reconciles unique review repositories against the current tunnel URL', async () => {
    process.env.SHEP_ENABLE_GITHUB_WEBHOOKS = '1';

    const featureRepo = {
      list: vi
        .fn()
        .mockResolvedValue([
          createFeature('/repo/a'),
          createFeature('/repo/a'),
          createFeature('/repo/b'),
        ]),
    };
    const webhookService = {
      ensureRepositoryWebhook: vi.fn().mockResolvedValue({ action: 'created' }),
    };

    const runtime = new GitHubWebhookRuntimeService(
      featureRepo as any,
      webhookService as any,
      4050,
      60_000,
      {
        createServer: vi.fn(
          () =>
            ({
              once: vi.fn(),
              listen: vi.fn((_port: number, _host: string, cb: () => void) => cb()),
              close: vi.fn((cb: () => void) => cb()),
            }) as any
        ),
        findAvailablePort: vi.fn().mockResolvedValue(4592),
        spawnProcess: vi.fn(() => createTunnelProcess('https://demo.trycloudflare.com')) as any,
        getSecret: vi.fn().mockReturnValue('secret'),
      }
    );

    const publicUrl = await runtime.start();

    expect(publicUrl).toBe('https://demo.trycloudflare.com');
    expect(webhookService.ensureRepositoryWebhook).toHaveBeenCalledTimes(2);
    expect(webhookService.ensureRepositoryWebhook).toHaveBeenCalledWith('/repo/a', {
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });
    expect(webhookService.ensureRepositoryWebhook).toHaveBeenCalledWith('/repo/b', {
      callbackUrl: 'https://demo.trycloudflare.com/api/webhooks/github?source=shep',
      secret: 'secret',
      events: ['pull_request', 'check_suite'],
    });

    await runtime.stop();
  });
});

import http from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { SdlcLifecycle } from '../../../domain/generated/output';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface';
import { findAvailablePort } from '../port.service';
import type { GitHubWebhookService } from './github-webhook.service';
import { getOrCreateGitHubWebhookSecret } from './webhook-secret.service';

const DEFAULT_GATEWAY_PORT = 4590;
const DEFAULT_RECONCILE_INTERVAL_MS = 60_000;
const TUNNEL_READY_TIMEOUT_MS = 15_000;
const GITHUB_WEBHOOK_CALLBACK_PATH = '/api/webhooks/github?source=shep';
const ENABLE_ENV = 'SHEP_ENABLE_GITHUB_WEBHOOKS';

type FetchFn = typeof fetch;

interface GitHubWebhookRuntimeDeps {
  createServer: typeof http.createServer;
  spawnProcess: typeof spawn;
  findAvailablePort: typeof findAvailablePort;
  fetchImpl: FetchFn;
  getSecret: typeof getOrCreateGitHubWebhookSecret;
  logInfo: (message: string) => void;
  logWarn: (message: string) => void;
}

const defaultDeps: GitHubWebhookRuntimeDeps = {
  createServer: http.createServer,
  spawnProcess: spawn,
  findAvailablePort,
  fetchImpl: fetch,
  getSecret: getOrCreateGitHubWebhookSecret,
  logInfo: (message) => process.stdout.write(`${message}\n`),
  logWarn: (message) => process.stderr.write(`${message}\n`),
};

export function isGitHubWebhookRuntimeEnabled(): boolean {
  return process.env[ENABLE_ENV] === '1' || process.env[ENABLE_ENV] === 'true';
}

export class GitHubWebhookRuntimeService {
  private readonly deps: GitHubWebhookRuntimeDeps;
  private gatewayServer: http.Server | null = null;
  private tunnelProcess: ChildProcess | null = null;
  private reconcileTimer: ReturnType<typeof setInterval> | null = null;
  private publicBaseUrl: string | null = null;
  private gatewayPort: number | null = null;
  private secret: string | null = null;

  constructor(
    private readonly featureRepo: IFeatureRepository,
    private readonly webhookService: Pick<GitHubWebhookService, 'ensureRepositoryWebhook'>,
    private readonly appPort: number,
    private readonly reconcileIntervalMs: number = DEFAULT_RECONCILE_INTERVAL_MS,
    deps: Partial<GitHubWebhookRuntimeDeps> = {}
  ) {
    this.deps = { ...defaultDeps, ...deps };
  }

  getPublicBaseUrl(): string | null {
    return this.publicBaseUrl;
  }

  getGatewayPort(): number | null {
    return this.gatewayPort;
  }

  async start(): Promise<string | null> {
    if (!isGitHubWebhookRuntimeEnabled()) {
      return null;
    }

    if (this.publicBaseUrl) {
      return this.publicBaseUrl;
    }

    this.secret = this.deps.getSecret();

    try {
      this.gatewayPort = await this.deps.findAvailablePort(DEFAULT_GATEWAY_PORT);
      await this.startGateway();
      this.publicBaseUrl = await this.startTunnel();
      await this.reconcileHooks();

      this.reconcileTimer = setInterval(() => {
        void this.reconcileHooks();
      }, this.reconcileIntervalMs);
      this.reconcileTimer.unref?.();

      return this.publicBaseUrl;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.reconcileTimer) {
      clearInterval(this.reconcileTimer);
      this.reconcileTimer = null;
    }

    if (this.tunnelProcess) {
      this.tunnelProcess.kill('SIGTERM');
      this.tunnelProcess = null;
    }

    if (this.gatewayServer) {
      await new Promise<void>((resolve) => {
        this.gatewayServer!.close(() => resolve());
      });
      this.gatewayServer = null;
    }

    this.publicBaseUrl = null;
    this.gatewayPort = null;
  }

  private async startGateway(): Promise<void> {
    const port = this.gatewayPort;
    if (!port) {
      throw new Error('Gateway port not allocated');
    }

    const server = this.deps.createServer((req, res) => {
      void this.handleGatewayRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => resolve());
    });

    this.gatewayServer = server;
  }

  private async handleGatewayRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    if (!req.url?.startsWith('/api/webhooks/')) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const body = await this.readRequestBody(req);
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (!value) continue;
      if (key === 'host' || key === 'connection' || key === 'content-length') continue;
      if (Array.isArray(value)) {
        for (const item of value) headers.append(key, item);
      } else {
        headers.set(key, value);
      }
    }

    const requestBody = this.requestCanHaveBody(req.method) ? new Uint8Array(body) : undefined;

    const response = await this.deps.fetchImpl(`http://127.0.0.1:${this.appPort}${req.url}`, {
      method: req.method,
      headers,
      body: requestBody,
    });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
  }

  private requestCanHaveBody(method: string | undefined): boolean {
    return method !== undefined && method !== 'GET' && method !== 'HEAD';
  }

  private async readRequestBody(req: http.IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  private async startTunnel(): Promise<string> {
    const port = this.gatewayPort;
    if (!port) {
      throw new Error('Gateway port not allocated');
    }

    const child = this.deps.spawnProcess(
      process.env.SHEP_CLOUDFLARED_BIN ?? 'cloudflared',
      ['tunnel', '--url', `http://127.0.0.1:${port}`],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );
    this.tunnelProcess = child;

    const publicUrl = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timed out waiting for cloudflared public URL'));
      }, TUNNEL_READY_TIMEOUT_MS);

      const onData = (chunk: Buffer | string) => {
        const match = String(chunk).match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
        if (!match) return;
        cleanup();
        resolve(match[0]);
      };

      const onExit = (code: number | null) => {
        cleanup();
        reject(new Error(`cloudflared exited before URL was ready (code ${code ?? 'unknown'})`));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        child.stdout?.off('data', onData);
        child.stderr?.off('data', onData);
        child.off('exit', onExit);
      };

      child.stdout?.on('data', onData);
      child.stderr?.on('data', onData);
      child.on('exit', onExit);
    });

    this.deps.logInfo(`[GitHubWebhookRuntime] Tunnel ready at ${publicUrl}`);
    return publicUrl;
  }

  private async reconcileHooks(): Promise<void> {
    if (!this.publicBaseUrl || !this.secret) return;

    const features = await this.featureRepo.list({ lifecycle: SdlcLifecycle.Review });
    const repoPaths = [
      ...new Set(features.map((feature) => feature.repositoryPath).filter(Boolean)),
    ];

    for (const repoPath of repoPaths) {
      try {
        const result = await this.webhookService.ensureRepositoryWebhook(repoPath, {
          callbackUrl: `${this.publicBaseUrl}${GITHUB_WEBHOOK_CALLBACK_PATH}`,
          secret: this.secret,
          events: ['pull_request', 'check_suite'],
        });

        if (result.action !== 'unchanged' && result.action !== 'skipped') {
          this.deps.logInfo(
            `[GitHubWebhookRuntime] ${result.action} webhook for ${repoPath} -> ${result.callbackUrl ?? 'n/a'}`
          );
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.deps.logWarn(`[GitHubWebhookRuntime] Failed to reconcile ${repoPath}: ${msg}`);
      }
    }
  }
}

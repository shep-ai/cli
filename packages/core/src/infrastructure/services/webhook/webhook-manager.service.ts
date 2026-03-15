/**
 * Webhook Manager Service
 *
 * Orchestrates the Cloudflare Tunnel and GitHub Webhook lifecycle.
 * Follows the singleton pattern used by NotificationWatcherService
 * and PrSyncWatcherService.
 *
 * Lifecycle:
 * 1. Start Cloudflare Tunnel to get a public URL
 * 2. Register GitHub webhooks pointing to the tunnel URL
 * 3. Monitor for tunnel URL changes → update webhooks
 * 4. On shutdown → remove webhooks → stop tunnel
 *
 * The manager is optional — if cloudflared is not installed or webhook
 * registration fails, the system falls back to polling gracefully.
 */

import type { ITunnelService } from '../../../application/ports/output/services/tunnel-service.interface.js';
import type { IWebhookService } from '../../../application/ports/output/services/webhook-service.interface.js';
import type {
  RegisteredWebhook,
  WebhookDeliveryRecord,
  GitHubWebhookService,
} from './github-webhook.service.js';

export interface WebhookSystemStatus {
  running: boolean;
  tunnel: {
    connected: boolean;
    publicUrl: string | null;
  };
  webhooks: {
    registered: readonly RegisteredWebhook[];
    totalDeliveries: number;
    successCount: number;
    errorCount: number;
    ignoredCount: number;
  };
  startedAt: string | null;
}

const TAG = '[WebhookManager]';

export class WebhookManagerService {
  private readonly tunnelService: ITunnelService;
  private readonly webhookService: IWebhookService;
  private running = false;
  private startedAt: string | null = null;

  constructor(tunnelService: ITunnelService, webhookService: IWebhookService) {
    this.tunnelService = tunnelService;
    this.webhookService = webhookService;
  }

  /**
   * Start the tunnel and register webhooks.
   * Fails gracefully — logs warnings but does not throw.
   *
   * @param localPort - The local web server port to tunnel
   */
  async start(localPort: number): Promise<void> {
    if (this.running) return;

    try {
      // Step 1: Start the tunnel
      // eslint-disable-next-line no-console
      console.log(`${TAG} Starting Cloudflare Tunnel for port ${localPort}...`);
      const publicUrl = await this.tunnelService.start(localPort);

      // Step 2: Listen for URL changes
      this.tunnelService.onUrlChange(async (newUrl) => {
        // eslint-disable-next-line no-console
        console.log(`${TAG} Tunnel URL changed, updating webhooks...`);
        try {
          await this.webhookService.updateWebhookUrl(newUrl);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          // eslint-disable-next-line no-console
          console.warn(`${TAG} Failed to update webhooks after URL change: ${msg}`);
        }
      });

      // Step 3: Register webhooks with external services
      await this.webhookService.registerWebhooks(publicUrl);

      this.running = true;
      this.startedAt = new Date().toISOString();
      // eslint-disable-next-line no-console
      console.log(`${TAG} Webhook system ready (tunnel: ${publicUrl})`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(`${TAG} Failed to start webhook system (falling back to polling): ${msg}`);

      // Clean up partial state
      try {
        await this.tunnelService.stop();
      } catch {
        // Already stopped or never started
      }
    }
  }

  /**
   * Stop the webhook system — remove webhooks, then stop the tunnel.
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    // eslint-disable-next-line no-console
    console.log(`${TAG} Shutting down webhook system...`);

    try {
      await this.webhookService.removeWebhooks();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(`${TAG} Failed to remove webhooks during shutdown: ${msg}`);
    }

    try {
      await this.tunnelService.stop();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.warn(`${TAG} Failed to stop tunnel during shutdown: ${msg}`);
    }

    this.running = false;
    // eslint-disable-next-line no-console
    console.log(`${TAG} Webhook system stopped`);
  }

  isRunning(): boolean {
    return this.running;
  }

  getTunnelUrl(): string | null {
    return this.tunnelService.getPublicUrl();
  }

  getStatus(): WebhookSystemStatus {
    const ghService = this.webhookService as GitHubWebhookService;
    const deliveries =
      typeof ghService.getDeliveryHistory === 'function' ? ghService.getDeliveryHistory() : [];

    const registered =
      typeof ghService.getRegisteredWebhooks === 'function'
        ? ghService.getRegisteredWebhooks()
        : [];

    let successCount = 0;
    let errorCount = 0;
    let ignoredCount = 0;
    for (const d of deliveries) {
      if (d.status === 'success') successCount++;
      else if (d.status === 'error') errorCount++;
      else ignoredCount++;
    }

    return {
      running: this.running,
      tunnel: {
        connected: this.tunnelService.isRunning(),
        publicUrl: this.tunnelService.getPublicUrl(),
      },
      webhooks: {
        registered,
        totalDeliveries: deliveries.length,
        successCount,
        errorCount,
        ignoredCount,
      },
      startedAt: this.startedAt,
    };
  }

  getDeliveryHistory(): readonly WebhookDeliveryRecord[] {
    const ghService = this.webhookService as GitHubWebhookService;
    if (typeof ghService.getDeliveryHistory === 'function') {
      return ghService.getDeliveryHistory();
    }
    return [];
  }
}

// --- Singleton accessors (follows NotificationWatcherService pattern) ---

let managerInstance: WebhookManagerService | null = null;

/**
 * Initialize the webhook manager singleton.
 * Must be called once during web server startup.
 *
 * @throws Error if the manager is already initialized
 */
export function initializeWebhookManager(
  tunnelService: ITunnelService,
  webhookService: IWebhookService
): void {
  if (managerInstance !== null) {
    throw new Error('Webhook manager already initialized. Cannot re-initialize.');
  }

  managerInstance = new WebhookManagerService(tunnelService, webhookService);
}

/**
 * Get the webhook manager singleton.
 *
 * @returns The webhook manager service
 * @throws Error if the manager hasn't been initialized yet
 */
export function getWebhookManager(): WebhookManagerService {
  if (managerInstance === null) {
    throw new Error(
      'Webhook manager not initialized. Call initializeWebhookManager() during web server startup.'
    );
  }

  return managerInstance;
}

/**
 * Check if the webhook manager has been initialized.
 */
export function hasWebhookManager(): boolean {
  return managerInstance !== null;
}

/**
 * Reset the webhook manager singleton (for testing purposes only).
 * Stops the manager if running before resetting.
 *
 * @internal
 */
export function resetWebhookManager(): void {
  if (managerInstance !== null) {
    void managerInstance.stop();
  }
  managerInstance = null;
}

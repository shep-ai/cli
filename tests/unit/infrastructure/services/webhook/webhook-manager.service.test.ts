/**
 * Webhook Manager Service Unit Tests
 *
 * Tests for the orchestrator that ties tunnel + webhook lifecycle together.
 *
 * TDD Phase: GREEN
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  WebhookManagerService,
  initializeWebhookManager,
  getWebhookManager,
  hasWebhookManager,
  resetWebhookManager,
} from '@/infrastructure/services/webhook/webhook-manager.service.js';
import type { ITunnelService } from '@/application/ports/output/services/tunnel-service.interface.js';
import type { IWebhookService } from '@/application/ports/output/services/webhook-service.interface.js';

function createMockTunnelService(): ITunnelService {
  return {
    start: vi.fn().mockResolvedValue('https://test.trycloudflare.com'),
    stop: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockReturnValue('https://test.trycloudflare.com'),
    onUrlChange: vi.fn(),
    isRunning: vi.fn().mockReturnValue(true),
  };
}

function createMockWebhookService(): IWebhookService {
  return {
    registerWebhooks: vi.fn().mockResolvedValue(undefined),
    updateWebhookUrl: vi.fn().mockResolvedValue(undefined),
    removeWebhooks: vi.fn().mockResolvedValue(undefined),
    validateSignature: vi.fn().mockReturnValue({ valid: true }),
    handleEvent: vi.fn().mockResolvedValue(undefined),
  };
}

describe('WebhookManagerService', () => {
  let tunnelService: ReturnType<typeof createMockTunnelService>;
  let webhookService: ReturnType<typeof createMockWebhookService>;
  let manager: WebhookManagerService;

  beforeEach(() => {
    tunnelService = createMockTunnelService();
    webhookService = createMockWebhookService();
    manager = new WebhookManagerService(tunnelService, webhookService);
  });

  describe('start', () => {
    it('should start tunnel and register webhooks', async () => {
      await manager.start(3000);

      expect(tunnelService.start).toHaveBeenCalledWith(3000);
      expect(tunnelService.onUrlChange).toHaveBeenCalled();
      expect(webhookService.registerWebhooks).toHaveBeenCalledWith(
        'https://test.trycloudflare.com'
      );
      expect(manager.isRunning()).toBe(true);
    });

    it('should register URL change handler that updates webhooks', async () => {
      await manager.start(3000);

      // Get the URL change handler that was registered
      const onUrlChange = vi.mocked(tunnelService.onUrlChange);
      expect(onUrlChange).toHaveBeenCalledTimes(1);
      const handler = onUrlChange.mock.calls[0][0];

      // Simulate URL change
      await handler('https://new-url.trycloudflare.com');

      expect(webhookService.updateWebhookUrl).toHaveBeenCalledWith(
        'https://new-url.trycloudflare.com'
      );
    });

    it('should not throw if tunnel start fails (graceful fallback)', async () => {
      vi.mocked(tunnelService.start).mockRejectedValue(new Error("'cloudflared' not found"));

      // Should not throw
      await expect(manager.start(3000)).resolves.toBeUndefined();
      expect(manager.isRunning()).toBe(false);
    });

    it('should clean up tunnel if webhook registration fails', async () => {
      vi.mocked(webhookService.registerWebhooks).mockRejectedValue(new Error('GitHub API error'));

      await expect(manager.start(3000)).resolves.toBeUndefined();
      expect(tunnelService.stop).toHaveBeenCalled();
      expect(manager.isRunning()).toBe(false);
    });

    it('should be idempotent when already running', async () => {
      await manager.start(3000);
      await manager.start(3000);

      expect(tunnelService.start).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should remove webhooks and stop tunnel', async () => {
      await manager.start(3000);
      await manager.stop();

      expect(webhookService.removeWebhooks).toHaveBeenCalled();
      expect(tunnelService.stop).toHaveBeenCalled();
      expect(manager.isRunning()).toBe(false);
    });

    it('should handle webhook removal failure gracefully', async () => {
      await manager.start(3000);
      vi.mocked(webhookService.removeWebhooks).mockRejectedValue(new Error('API error'));

      await expect(manager.stop()).resolves.toBeUndefined();
      expect(tunnelService.stop).toHaveBeenCalled();
    });

    it('should be safe to call stop when not running', async () => {
      await expect(manager.stop()).resolves.toBeUndefined();
    });
  });

  describe('getTunnelUrl', () => {
    it('should return tunnel URL when running', async () => {
      await manager.start(3000);
      expect(manager.getTunnelUrl()).toBe('https://test.trycloudflare.com');
    });
  });
});

describe('Singleton accessors', () => {
  afterEach(() => {
    resetWebhookManager();
  });

  it('should initialize and retrieve singleton', () => {
    const tunnel = createMockTunnelService();
    const webhook = createMockWebhookService();

    expect(hasWebhookManager()).toBe(false);

    initializeWebhookManager(tunnel, webhook);

    expect(hasWebhookManager()).toBe(true);
    expect(getWebhookManager()).toBeInstanceOf(WebhookManagerService);
  });

  it('should throw on double initialization', () => {
    const tunnel = createMockTunnelService();
    const webhook = createMockWebhookService();

    initializeWebhookManager(tunnel, webhook);

    expect(() => initializeWebhookManager(tunnel, webhook)).toThrow('already initialized');
  });

  it('should throw when getting uninitialized manager', () => {
    expect(() => getWebhookManager()).toThrow('not initialized');
  });

  it('should reset cleanly', () => {
    const tunnel = createMockTunnelService();
    const webhook = createMockWebhookService();

    initializeWebhookManager(tunnel, webhook);
    resetWebhookManager();

    expect(hasWebhookManager()).toBe(false);
  });
});

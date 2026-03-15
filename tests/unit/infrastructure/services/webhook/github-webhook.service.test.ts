/**
 * GitHub Webhook Service Unit Tests
 *
 * Tests for signature validation, event handling, and webhook registration.
 *
 * TDD Phase: GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';
import { GitHubWebhookService } from '@/infrastructure/services/webhook/github-webhook.service.js';
import { SdlcLifecycle, PrStatus, CiStatus } from '@/domain/generated/output.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IGitPrService } from '@/application/ports/output/services/git-pr-service.interface.js';
import type { INotificationService } from '@/application/ports/output/services/notification-service.interface.js';
import type { Feature } from '@/domain/generated/output.js';

function createMockFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-1',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    lifecycle: SdlcLifecycle.Review,
    branch: 'feat/test',
    repositoryPath: '/repo/path',
    pr: {
      url: 'https://github.com/owner/repo/pull/42',
      number: 42,
      status: PrStatus.Open,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  } as Feature;
}

describe('GitHubWebhookService', () => {
  let service: GitHubWebhookService;
  let mockFeatureRepo: IFeatureRepository;
  let mockGitPrService: IGitPrService;
  let mockNotificationService: INotificationService;

  let mockExecFn: any;

  beforeEach(() => {
    mockFeatureRepo = {
      list: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    } as unknown as IFeatureRepository;

    mockGitPrService = {
      getRemoteUrl: vi.fn().mockResolvedValue('https://github.com/owner/repo'),
      hasRemote: vi.fn().mockResolvedValue(true),
    } as unknown as IGitPrService;

    mockNotificationService = {
      notify: vi.fn(),
    } as unknown as INotificationService;

    mockExecFn = vi.fn().mockResolvedValue({ stdout: '{}', stderr: '' });

    service = new GitHubWebhookService(
      mockFeatureRepo,
      mockGitPrService,
      mockNotificationService,
      mockExecFn
    );
  });

  describe('validateSignature', () => {
    it('should accept valid HMAC-SHA256 signature', () => {
      const secret = service.getSecret();
      const payload = '{"action":"opened"}';
      const hmac = createHmac('sha256', secret).update(payload).digest('hex');
      const signature = `sha256=${hmac}`;

      const result = service.validateSignature(payload, signature, secret);
      expect(result.valid).toBe(true);
    });

    it('should reject missing signature', () => {
      const result = service.validateSignature('payload', '', 'secret');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing signature');
    });

    it('should reject invalid signature format', () => {
      const result = service.validateSignature('payload', 'md5=abc', 'secret');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature format');
    });

    it('should reject wrong signature value', () => {
      const result = service.validateSignature(
        'payload',
        'sha256=0000000000000000000000000000000000000000000000000000000000000000',
        'secret'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mismatch');
    });

    it('should reject invalid hex encoding', () => {
      const result = service.validateSignature('payload', 'sha256=notvalidhex', 'secret');
      expect(result.valid).toBe(false);
    });
  });

  describe('handleEvent — pull_request', () => {
    it('should update feature when PR is merged', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);

      await service.handleEvent({
        source: 'github',
        eventType: 'pull_request',
        deliveryId: 'del-1',
        payload: {
          action: 'closed',
          pull_request: {
            number: 42,
            html_url: 'https://github.com/owner/repo/pull/42',
            merged: true,
            head: { ref: 'feat/test' },
          },
        },
      });

      expect(mockFeatureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          lifecycle: SdlcLifecycle.Maintain,
          pr: expect.objectContaining({ status: PrStatus.Merged }),
        })
      );
      expect(mockNotificationService.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('merged'),
        })
      );
    });

    it('should update feature when PR is closed without merge', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);

      await service.handleEvent({
        source: 'github',
        eventType: 'pull_request',
        deliveryId: 'del-2',
        payload: {
          action: 'closed',
          pull_request: {
            number: 42,
            html_url: 'https://github.com/owner/repo/pull/42',
            merged: false,
            head: { ref: 'feat/test' },
          },
        },
      });

      expect(mockFeatureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pr: expect.objectContaining({ status: PrStatus.Closed }),
        })
      );
    });

    it('should match by branch when PR number does not match', async () => {
      const feature = createMockFeature({ pr: undefined });
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);

      await service.handleEvent({
        source: 'github',
        eventType: 'pull_request',
        deliveryId: 'del-3',
        payload: {
          action: 'closed',
          pull_request: {
            number: 99,
            html_url: 'https://github.com/owner/repo/pull/99',
            merged: true,
            head: { ref: 'feat/test' },
          },
        },
      });

      expect(mockFeatureRepo.update).toHaveBeenCalled();
    });

    it('should ignore events for unknown features', async () => {
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([]);

      await service.handleEvent({
        source: 'github',
        eventType: 'pull_request',
        deliveryId: 'del-4',
        payload: {
          action: 'closed',
          pull_request: {
            number: 999,
            html_url: 'https://github.com/owner/repo/pull/999',
            merged: true,
            head: { ref: 'unknown-branch' },
          },
        },
      });

      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('handleEvent — check_suite', () => {
    it('should update CI status on check_suite completion', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);

      await service.handleEvent({
        source: 'github',
        eventType: 'check_suite',
        deliveryId: 'del-5',
        payload: {
          action: 'completed',
          check_suite: {
            conclusion: 'success',
            head_branch: 'feat/test',
          },
        },
      });

      expect(mockFeatureRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pr: expect.objectContaining({ ciStatus: CiStatus.Success }),
        })
      );
    });

    it('should ignore non-completed check_suite actions', async () => {
      await service.handleEvent({
        source: 'github',
        eventType: 'check_suite',
        deliveryId: 'del-6',
        payload: {
          action: 'requested',
          check_suite: {
            conclusion: null,
            head_branch: 'feat/test',
          },
        },
      });

      expect(mockFeatureRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('registerWebhooks', () => {
    it('should register webhooks for repos with review features', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);
      vi.mocked(mockGitPrService.getRemoteUrl).mockResolvedValue('https://github.com/owner/repo');
      mockExecFn.mockResolvedValue({ stdout: JSON.stringify({ id: 123 }), stderr: '' });

      await service.registerWebhooks('https://tunnel.trycloudflare.com');

      expect(mockExecFn).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'api',
          '--method',
          'POST',
          expect.stringContaining('/repos/owner/repo/hooks'),
        ]),
        expect.objectContaining({ cwd: '/repo/path' })
      );
    });

    it('should handle registration failure gracefully', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);
      vi.mocked(mockGitPrService.getRemoteUrl).mockResolvedValue('https://github.com/owner/repo');
      mockExecFn.mockRejectedValue(new Error('gh api failed'));

      // Should not throw
      await expect(
        service.registerWebhooks('https://tunnel.trycloudflare.com')
      ).resolves.toBeUndefined();
    });
  });

  describe('removeWebhooks', () => {
    it('should remove all registered webhooks', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);
      vi.mocked(mockGitPrService.getRemoteUrl).mockResolvedValue('https://github.com/owner/repo');
      mockExecFn.mockResolvedValue({ stdout: JSON.stringify({ id: 456 }), stderr: '' });

      await service.registerWebhooks('https://tunnel.trycloudflare.com');
      mockExecFn.mockClear();

      await service.removeWebhooks();

      expect(mockExecFn).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['api', '--method', 'DELETE']),
        expect.any(Object)
      );
    });
  });

  describe('updateWebhookUrl', () => {
    it('should update URL for all registered webhooks', async () => {
      const feature = createMockFeature();
      vi.mocked(mockFeatureRepo.list).mockResolvedValue([feature]);
      vi.mocked(mockGitPrService.getRemoteUrl).mockResolvedValue('https://github.com/owner/repo');
      mockExecFn.mockResolvedValue({ stdout: JSON.stringify({ id: 789 }), stderr: '' });

      await service.registerWebhooks('https://old-url.trycloudflare.com');
      mockExecFn.mockClear();

      await service.updateWebhookUrl('https://new-url.trycloudflare.com');

      expect(mockExecFn).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'api',
          '--method',
          'PATCH',
          expect.stringContaining('/repos/owner/repo/hooks/'),
        ]),
        expect.any(Object)
      );
    });
  });
});

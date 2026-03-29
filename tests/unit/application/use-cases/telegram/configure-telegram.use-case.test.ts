/**
 * Configure Telegram Use Case Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigureTelegramUseCase } from '@/application/use-cases/telegram/configure-telegram.use-case.js';
import type { ISettingsRepository } from '@/application/ports/output/repositories/settings.repository.interface.js';
import type { ITelegramService } from '@/application/ports/output/services/telegram-service.interface.js';
import type { Settings } from '@/domain/generated/output.js';
import { AgentType, AgentAuthMethod, EditorType, TerminalType } from '@/domain/generated/output.js';

function createMockSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    id: 'test-id',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T12:00:00Z'),
    models: { default: 'claude-sonnet-4-6' },
    user: {},
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
      terminalPreference: TerminalType.System,
    },
    system: { autoUpdate: true, logLevel: 'info' },
    agent: { type: AgentType.ClaudeCode, authMethod: AgentAuthMethod.Session },
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: false },
      desktop: { enabled: false },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
        prBlocked: true,
        mergeReviewReady: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
      enableEvidence: false,
      commitEvidence: false,
      ciWatchEnabled: true,
    },
    onboardingComplete: true,
    ...overrides,
  };
}

describe('ConfigureTelegramUseCase', () => {
  let useCase: ConfigureTelegramUseCase;
  let mockRepo: {
    load: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let mockTelegramService: {
    validateBotToken: ReturnType<typeof vi.fn>;
    resolveChatId: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
    sendNotification: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepo = {
      load: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    };
    mockTelegramService = {
      validateBotToken: vi.fn(),
      resolveChatId: vi.fn(),
      sendMessage: vi.fn(),
      sendNotification: vi.fn(),
    };
    useCase = new ConfigureTelegramUseCase(
      mockRepo as unknown as ISettingsRepository,
      mockTelegramService as unknown as ITelegramService
    );
  });

  describe('disabling telegram', () => {
    it('should disable telegram integration', async () => {
      const settings = createMockSettings({
        telegram: {
          enabled: true,
          botToken: '123:ABC',
          chatId: '456',
          notifyEvents: {
            agentStarted: false,
            phaseCompleted: false,
            waitingApproval: true,
            agentCompleted: true,
            agentFailed: true,
            prMerged: true,
            prClosed: false,
            prChecksPassed: false,
            prChecksFailed: true,
            prBlocked: true,
            mergeReviewReady: true,
          },
        },
      });
      mockRepo.load.mockResolvedValue(settings);

      const result = await useCase.execute({ enabled: false });

      expect(result.settings.telegram?.enabled).toBe(false);
      // Preserves token and chatId for re-enable
      expect(result.settings.telegram?.botToken).toBe('123:ABC');
      expect(result.settings.telegram?.chatId).toBe('456');
      expect(mockRepo.update).toHaveBeenCalled();
    });
  });

  describe('enabling telegram', () => {
    it('should validate bot token and resolve chat ID', async () => {
      const settings = createMockSettings();
      mockRepo.load.mockResolvedValue(settings);
      mockTelegramService.validateBotToken.mockResolvedValue({
        id: 123,
        firstName: 'ShepBot',
        username: 'shep_test_bot',
      });
      mockTelegramService.resolveChatId.mockResolvedValue({
        chatId: '456789',
        firstName: 'Alice',
      });
      mockTelegramService.sendMessage.mockResolvedValue(undefined);

      const result = await useCase.execute({
        enabled: true,
        botToken: '123:ABC',
      });

      expect(result.settings.telegram?.enabled).toBe(true);
      expect(result.settings.telegram?.botToken).toBe('123:ABC');
      expect(result.settings.telegram?.chatId).toBe('456789');
      expect(result.botInfo?.username).toBe('shep_test_bot');
      expect(result.chatResolution?.chatId).toBe('456789');
      expect(mockTelegramService.validateBotToken).toHaveBeenCalledWith('123:ABC');
      expect(mockTelegramService.resolveChatId).toHaveBeenCalledWith('123:ABC');
      expect(mockTelegramService.sendMessage).toHaveBeenCalled();
    });

    it('should skip chat resolution when chatId is provided', async () => {
      const settings = createMockSettings();
      mockRepo.load.mockResolvedValue(settings);
      mockTelegramService.validateBotToken.mockResolvedValue({
        id: 123,
        firstName: 'ShepBot',
        username: 'shep_test_bot',
      });
      mockTelegramService.sendMessage.mockResolvedValue(undefined);

      const result = await useCase.execute({
        enabled: true,
        botToken: '123:ABC',
        chatId: '999',
      });

      expect(result.settings.telegram?.chatId).toBe('999');
      expect(mockTelegramService.resolveChatId).not.toHaveBeenCalled();
    });

    it('should throw when no bot token is provided', async () => {
      const settings = createMockSettings();
      mockRepo.load.mockResolvedValue(settings);

      await expect(useCase.execute({ enabled: true })).rejects.toThrow('Bot token is required');
    });

    it('should reuse existing bot token from settings', async () => {
      const settings = createMockSettings({
        telegram: {
          enabled: false,
          botToken: 'existing-token',
          chatId: '456',
          notifyEvents: {
            agentStarted: false,
            phaseCompleted: false,
            waitingApproval: true,
            agentCompleted: true,
            agentFailed: true,
            prMerged: true,
            prClosed: false,
            prChecksPassed: false,
            prChecksFailed: true,
            prBlocked: true,
            mergeReviewReady: true,
          },
        },
      });
      mockRepo.load.mockResolvedValue(settings);
      mockTelegramService.validateBotToken.mockResolvedValue({
        id: 123,
        firstName: 'ShepBot',
        username: 'shep_test_bot',
      });
      mockTelegramService.sendMessage.mockResolvedValue(undefined);

      const result = await useCase.execute({ enabled: true });

      expect(mockTelegramService.validateBotToken).toHaveBeenCalledWith('existing-token');
      expect(result.settings.telegram?.botToken).toBe('existing-token');
    });

    it('should throw when settings are not initialized', async () => {
      mockRepo.load.mockResolvedValue(null);

      await expect(useCase.execute({ enabled: true, botToken: '123:ABC' })).rejects.toThrow(
        'Settings not initialized'
      );
    });
  });
});

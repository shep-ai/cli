/**
 * AgentExecutorFactory Unit Tests
 *
 * Tests for the factory that creates agent executor instances.
 * Uses constructor-injected spawn function mock (NOT vi.mock of child_process).
 *
 * TDD Phase: RED-GREEN-REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentExecutorFactory } from '@/infrastructure/services/agents/common/agent-executor-factory.service.js';
import { DevAgentExecutorService } from '@/infrastructure/services/agents/common/executors/dev-executor.service.js';
import { CodexCliExecutorService } from '@/infrastructure/services/agents/common/executors/codex-cli-executor.service.js';
import type { SpawnFunction } from '@/infrastructure/services/agents/common/types.js';
import { AgentType, AgentAuthMethod } from '@/domain/generated/output.js';
import type { AgentConfig } from '@/domain/generated/output.js';

describe('AgentExecutorFactory', () => {
  let factory: AgentExecutorFactory;
  let mockSpawn: SpawnFunction;
  const defaultAuthConfig: AgentConfig = {
    type: AgentType.ClaudeCode,
    authMethod: AgentAuthMethod.Session,
  };

  beforeEach(() => {
    mockSpawn = vi.fn();
    factory = new AgentExecutorFactory(mockSpawn);
  });

  describe('createExecutor', () => {
    it('should create ClaudeCodeExecutor for claude-code type', () => {
      const executor = factory.createExecutor(AgentType.ClaudeCode, defaultAuthConfig);

      expect(executor).toBeDefined();
      expect(executor.agentType).toBe(AgentType.ClaudeCode);
    });

    it('should create GeminiCliExecutor for gemini-cli type', () => {
      const geminiConfig: AgentConfig = {
        type: AgentType.GeminiCli,
        authMethod: AgentAuthMethod.Session,
      };

      const executor = factory.createExecutor(AgentType.GeminiCli, geminiConfig);

      expect(executor).toBeDefined();
      expect(executor.agentType).toBe(AgentType.GeminiCli);
    });

    it('should cache gemini-cli executor instances', () => {
      const geminiConfig: AgentConfig = {
        type: AgentType.GeminiCli,
        authMethod: AgentAuthMethod.Session,
      };

      const executor1 = factory.createExecutor(AgentType.GeminiCli, geminiConfig);
      const executor2 = factory.createExecutor(AgentType.GeminiCli, geminiConfig);

      expect(executor1).toBe(executor2);
    });

    it('should create DevAgentExecutorService for dev type', () => {
      const devConfig: AgentConfig = {
        type: AgentType.Dev,
        authMethod: AgentAuthMethod.Session,
      };

      const executor = factory.createExecutor(AgentType.Dev, devConfig);

      expect(executor).toBeDefined();
      expect(executor).toBeInstanceOf(DevAgentExecutorService);
      expect(executor.agentType).toBe(AgentType.Dev);
    });

    it('should cache dev executor instances (singleton per type)', () => {
      const devConfig: AgentConfig = {
        type: AgentType.Dev,
        authMethod: AgentAuthMethod.Session,
      };

      const executor1 = factory.createExecutor(AgentType.Dev, devConfig);
      const executor2 = factory.createExecutor(AgentType.Dev, devConfig);

      expect(executor1).toBe(executor2);
    });

    it('should throw for aider agent type', () => {
      const aiderConfig: AgentConfig = {
        type: AgentType.Aider,
        authMethod: AgentAuthMethod.Session,
      };

      expect(() => factory.createExecutor(AgentType.Aider, aiderConfig)).toThrow(
        'Unsupported agent type: aider'
      );
    });

    it('should create CursorExecutor for cursor type', () => {
      const cursorConfig: AgentConfig = {
        type: AgentType.Cursor,
        authMethod: AgentAuthMethod.Session,
      };

      const executor = factory.createExecutor(AgentType.Cursor, cursorConfig);

      expect(executor).toBeDefined();
      expect(executor.agentType).toBe(AgentType.Cursor);
    });

    it('should create CodexCliExecutorService for codex-cli type', () => {
      const codexConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: AgentAuthMethod.Session,
      };

      const executor = factory.createExecutor(AgentType.CodexCli, codexConfig);

      expect(executor).toBeDefined();
      expect(executor).toBeInstanceOf(CodexCliExecutorService);
      expect(executor.agentType).toBe(AgentType.CodexCli);
    });

    it('should cache codex-cli executor instances', () => {
      const codexConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: AgentAuthMethod.Session,
      };

      const executor1 = factory.createExecutor(AgentType.CodexCli, codexConfig);
      const executor2 = factory.createExecutor(AgentType.CodexCli, codexConfig);

      expect(executor1).toBe(executor2);
    });

    it('should pass authConfig to CodexCliExecutorService', () => {
      const codexConfig: AgentConfig = {
        type: AgentType.CodexCli,
        authMethod: AgentAuthMethod.Token,
        token: 'test-codex-key',
      };

      const executor = factory.createExecutor(AgentType.CodexCli, codexConfig);

      expect(executor).toBeInstanceOf(CodexCliExecutorService);
    });

    it('should return executor with correct agentType', () => {
      const executor = factory.createExecutor(AgentType.ClaudeCode, defaultAuthConfig);

      expect(executor.agentType).toBe('claude-code');
    });

    it('should cache executor instances (singleton per type)', () => {
      const executor1 = factory.createExecutor(AgentType.ClaudeCode, defaultAuthConfig);
      const executor2 = factory.createExecutor(AgentType.ClaudeCode, defaultAuthConfig);

      expect(executor1).toBe(executor2);
    });
  });

  describe('getSupportedAgents', () => {
    it('should list supported agents', () => {
      const supported = factory.getSupportedAgents();

      expect(supported).toContain('claude-code');
      expect(supported).toContain('cursor');
      expect(supported).toContain('gemini-cli');
      expect(supported).toContain('codex-cli');
      expect(supported).toContain('dev');
      expect(supported).toHaveLength(5);
    });

    it('should not include unsupported agents', () => {
      const supported = factory.getSupportedAgents();

      expect(supported).not.toContain('aider');
      expect(supported).not.toContain('continue');
    });
  });

  describe('getCliInfo', () => {
    it('should include codex-cli entry with cmd codex', () => {
      const cliInfos = factory.getCliInfo();
      const codexInfo = cliInfos.find((info) => info.agentType === AgentType.CodexCli);

      expect(codexInfo).toBeDefined();
      expect(codexInfo!.cmd).toBe('codex');
      expect(codexInfo!.versionArgs).toEqual(['--version']);
    });
  });

  describe('getSupportedModels', () => {
    it('should return claude-code model list', () => {
      const models = factory.getSupportedModels(AgentType.ClaudeCode);

      expect(models).toEqual(['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']);
    });

    it('should return gemini-cli model list', () => {
      const models = factory.getSupportedModels(AgentType.GeminiCli);

      expect(models).toEqual([
        'gemini-3.1-pro',
        'gemini-3-flash',
        'gemini-2.5-pro',
        'gemini-2.5-flash',
      ]);
    });

    it('should return cursor model list', () => {
      const models = factory.getSupportedModels(AgentType.Cursor);

      expect(models).toEqual([
        'claude-opus-4-6',
        'claude-sonnet-4-6',
        'gpt-5.4-high',
        'gpt-5.2',
        'gpt-5.3-codex',
        'gemini-3.1-pro',
        'composer-1.5',
        'grok-code',
      ]);
    });

    it('should return codex-cli model list with 12 models', () => {
      const models = factory.getSupportedModels(AgentType.CodexCli);

      expect(models).toHaveLength(12);
      expect(models).toEqual([
        'gpt-5.4',
        'gpt-5.4-mini',
        'gpt-5.3-codex',
        'gpt-5.3-codex-spark',
        'gpt-5.2-codex',
        'gpt-5.2',
        'gpt-5.1-codex-max',
        'gpt-5.1-codex',
        'gpt-5.1',
        'gpt-5-codex',
        'gpt-5-codex-mini',
        'gpt-5',
      ]);
    });

    it('should return empty array for dev agent', () => {
      const models = factory.getSupportedModels(AgentType.Dev);

      expect(models).toEqual([]);
    });

    it('should return empty array for unknown agent type', () => {
      const models = factory.getSupportedModels('aider' as AgentType);

      expect(models).toEqual([]);
    });

    it('should return synchronously (no promise)', () => {
      const result = factory.getSupportedModels(AgentType.ClaudeCode);

      expect(result).not.toBeInstanceOf(Promise);
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

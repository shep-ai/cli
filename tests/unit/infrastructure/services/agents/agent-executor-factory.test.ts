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
      expect(supported).toContain('dev');
      expect(supported).toHaveLength(4);
    });

    it('should not include unsupported agents', () => {
      const supported = factory.getSupportedAgents();

      expect(supported).not.toContain('aider');
      expect(supported).not.toContain('continue');
    });
  });

  describe('getSupportedModels', () => {
    it('should return claude-code model list', () => {
      const models = factory.getSupportedModels(AgentType.ClaudeCode);

      expect(models).toEqual(['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5']);
    });

    it('should return gemini-cli model list', () => {
      const models = factory.getSupportedModels(AgentType.GeminiCli);

      expect(models).toEqual(['gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-pro']);
    });

    it('should return cursor model list', () => {
      const models = factory.getSupportedModels(AgentType.Cursor);

      expect(models).toEqual([
        'claude-3-5-sonnet-20241022',
        'claude-3-haiku-20240307',
        'gpt-4o',
        'cursor-small',
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

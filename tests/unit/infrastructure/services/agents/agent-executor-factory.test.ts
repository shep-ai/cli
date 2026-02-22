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
      expect(supported).toHaveLength(3);
    });

    it('should not include unsupported agents', () => {
      const supported = factory.getSupportedAgents();

      expect(supported).not.toContain('aider');
      expect(supported).not.toContain('continue');
    });
  });
});

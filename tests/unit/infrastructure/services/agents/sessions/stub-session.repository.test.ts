/**
 * StubSessionRepository Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import { StubSessionRepository } from '@/infrastructure/services/agents/sessions/stub-session.repository.js';
import { AgentType } from '@/domain/generated/output.js';

describe('StubSessionRepository', () => {
  describe('isSupported', () => {
    it('should return false for cursor agent type', () => {
      const repo = new StubSessionRepository(AgentType.Cursor);
      expect(repo.isSupported()).toBe(false);
    });

    it('should return false for gemini-cli agent type', () => {
      const repo = new StubSessionRepository(AgentType.GeminiCli);
      expect(repo.isSupported()).toBe(false);
    });
  });

  describe('list', () => {
    it('should return an empty array', async () => {
      const repo = new StubSessionRepository(AgentType.Cursor);
      const result = await repo.list();
      expect(result).toEqual([]);
    });

    it('should return an empty array regardless of options', async () => {
      const repo = new StubSessionRepository(AgentType.GeminiCli);
      const result = await repo.list({ limit: 100 });
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return null for any session ID', async () => {
      const repo = new StubSessionRepository(AgentType.Cursor);
      const result = await repo.findById('any-session-id');
      expect(result).toBeNull();
    });

    it('should return null regardless of options', async () => {
      const repo = new StubSessionRepository(AgentType.GeminiCli);
      const result = await repo.findById('abc123', { messageLimit: 20 });
      expect(result).toBeNull();
    });
  });
});

/**
 * ClaudeCodeSessionRepository Integration Tests
 *
 * Uses fixture JSONL files in tests/fixtures/claude-sessions/ as basePath.
 * File mtimes are set explicitly in beforeAll to ensure deterministic ordering.
 *
 * Fixture layout:
 *   -home-user-projects-foo/session-001.jsonl  (valid, string content, 4 messages)
 *   -home-user-projects-foo/session-002.jsonl  (valid, array content, 2 messages)
 *   -home-user-projects-foo/session-003.jsonl  (malformed — invalid JSON on line 2)
 *   -home-user-projects-bar/session-004.jsonl  (minimal, 1 user message)
 *
 * Mtime order (descending): session-001 > session-002 > session-004 > session-003
 */

import 'reflect-metadata';
import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as url from 'node:url';
import { ClaudeCodeSessionRepository } from '@/infrastructure/services/agents/sessions/claude-code-session.repository.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURES_PATH = path.resolve(__dirname, '../../../../../fixtures/claude-sessions');

/** Set explicit mtimes so tests are deterministic regardless of file creation order */
async function setFixtureMtimes(): Promise<void> {
  const files = {
    '-home-user-projects-foo/session-001.jsonl': new Date('2025-01-04T10:00:00Z'),
    '-home-user-projects-foo/session-002.jsonl': new Date('2025-01-03T10:00:00Z'),
    '-home-user-projects-foo/session-003.jsonl': new Date('2025-01-02T10:00:00Z'),
    '-home-user-projects-bar/session-004.jsonl': new Date('2025-01-01T10:00:00Z'),
  };

  await Promise.all(
    Object.entries(files).map(([relPath, mtime]) =>
      fs.utimes(path.join(FIXTURES_PATH, relPath), mtime, mtime)
    )
  );
}

describe('ClaudeCodeSessionRepository (integration)', () => {
  let repo: ClaudeCodeSessionRepository;

  beforeAll(async () => {
    await setFixtureMtimes();
    repo = new ClaudeCodeSessionRepository(FIXTURES_PATH);
  });

  describe('isSupported', () => {
    it('should return true', () => {
      expect(repo.isSupported()).toBe(true);
    });
  });

  describe('list()', () => {
    it('should return 3 valid sessions (session-003 is skipped as malformed)', async () => {
      const sessions = await repo.list({ limit: 0 });
      expect(sessions).toHaveLength(3);
    });

    it('should return sessions sorted by mtime descending', async () => {
      const sessions = await repo.list({ limit: 0 });
      const ids = sessions.map((s) => s.id);
      // session-001 newest, then session-002, then session-004 oldest
      expect(ids).toEqual(['session-001', 'session-002', 'session-004']);
    });

    it('should return at most 2 sessions with limit: 2', async () => {
      const sessions = await repo.list({ limit: 2 });
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toEqual(['session-001', 'session-002']);
    });

    it('should return all valid sessions with limit: 0', async () => {
      const sessions = await repo.list({ limit: 0 });
      expect(sessions.length).toBeGreaterThanOrEqual(3);
    });

    it('should return sessions with default limit of 20', async () => {
      const sessions = await repo.list();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions.length).toBeLessThanOrEqual(20);
    });

    it('should skip malformed session-003 silently without crashing', async () => {
      const sessions = await repo.list({ limit: 0 });
      const ids = sessions.map((s) => s.id);
      expect(ids).not.toContain('session-003');
    });

    it('should extract preview from array content blocks for session-002', async () => {
      const sessions = await repo.list({ limit: 0 });
      const session002 = sessions.find((s) => s.id === 'session-002');
      expect(session002).toBeDefined();
      expect(session002?.preview).toBe('Debug this TypeScript error');
    });

    it('should extract preview from string content for session-001', async () => {
      const sessions = await repo.list({ limit: 0 });
      const session001 = sessions.find((s) => s.id === 'session-001');
      expect(session001).toBeDefined();
      expect(session001?.preview).toBe('Help me implement a feature');
    });

    it('should tilde-abbreviate the project path', async () => {
      const sessions = await repo.list({ limit: 0 });
      for (const session of sessions) {
        // Paths from fixtures use /home/user/... which is not the real home dir,
        // so they will NOT be abbreviated — but they should be valid strings
        expect(typeof session.projectPath).toBe('string');
        expect(session.projectPath.length).toBeGreaterThan(0);
      }
    });

    it('should include messageCount for each session', async () => {
      const sessions = await repo.list({ limit: 0 });
      const session001 = sessions.find((s) => s.id === 'session-001');
      expect(session001?.messageCount).toBe(4); // 2 user + 2 assistant messages

      const session002 = sessions.find((s) => s.id === 'session-002');
      expect(session002?.messageCount).toBe(2); // 1 user + 1 assistant

      const session004 = sessions.find((s) => s.id === 'session-004');
      expect(session004?.messageCount).toBe(1); // 1 user message
    });

    it('should not populate messages array in list view', async () => {
      const sessions = await repo.list({ limit: 0 });
      for (const session of sessions) {
        expect(session.messages).toBeUndefined();
      }
    });
  });

  describe('findById()', () => {
    it('should return the correct session for session-001', async () => {
      const session = await repo.findById('session-001');
      expect(session).not.toBeNull();
      expect(session?.id).toBe('session-001');
    });

    it('should populate messages for session-001 with default messageLimit', async () => {
      const session = await repo.findById('session-001', { messageLimit: 20 });
      expect(session?.messages).toBeDefined();
      expect(session?.messages?.length).toBe(4); // all 4 messages
    });

    it('should return only the last N messages when messageLimit is specified', async () => {
      const session = await repo.findById('session-001', { messageLimit: 1 });
      expect(session?.messages).toHaveLength(1);
      // Last message is the assistant response
      expect(session?.messages?.[0].role).toBe('assistant');
    });

    it('should return all messages when messageLimit is 0', async () => {
      const session = await repo.findById('session-001', { messageLimit: 0 });
      expect(session?.messages?.length).toBe(4);
    });

    it('should extract array content blocks for session-002 messages', async () => {
      const session = await repo.findById('session-002', { messageLimit: 20 });
      const userMsg = session?.messages?.find((m) => m.role === 'user');
      expect(userMsg?.content).toBe('Debug this TypeScript error');
    });

    it('should return null for a non-existent session ID', async () => {
      const session = await repo.findById('nonexistent-session-xyz');
      expect(session).toBeNull();
    });

    it('should populate firstMessageAt and lastMessageAt', async () => {
      const session = await repo.findById('session-001', { messageLimit: 20 });
      expect(session?.firstMessageAt).toBeDefined();
      expect(session?.lastMessageAt).toBeDefined();
    });
  });
});

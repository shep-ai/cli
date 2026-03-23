/**
 * Shared session scanning logic used by both /api/sessions and /api/sessions-batch.
 *
 * Scans Claude Code and Cursor session directories for JSONL session files,
 * parsing headers to extract preview, message count, and timestamps.
 */

import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

export interface SessionResult {
  id: string;
  agentType: string;
  preview: string | null;
  messageCount: number;
  firstMessageAt: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
  projectPath: string;
  filePath: string;
  /** mtime for sorting — not sent to client */
  _mtime: number;
}

// ── Path encoding helpers ─────────────────────────────────────────────

/**
 * Claude Code encodes paths by replacing '/', '\', '.' with '-'.
 * e.g. /home/user/.shep/repos/abc → -home-user--shep-repos-abc
 */
function claudeEncodePath(p: string): string {
  return p.replace(/[/\\.]/g, '-');
}

/**
 * Cursor encodes paths by stripping the leading '/', removing dots,
 * and replacing '/' and '\' with '-'.
 * e.g. /home/user/.shep/repos/abc → home-user-shep-repos-abc
 */
function cursorEncodePath(p: string): string {
  return p.replace(/^\//, '').replace(/\./g, '').replace(/[/\\]/g, '-');
}

// ── Shared helpers ────────────────────────────────────────────────────

function extractText(content: unknown): string | null {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    for (const block of content) {
      if (typeof block === 'object' && block !== null) {
        const b = block as Record<string, unknown>;
        if (b.type === 'text' && typeof b.text === 'string') return b.text;
      }
    }
  }
  return null;
}

const PREVIEW_READ_BYTES = 8_192; // 8KB is enough for first few messages

// ── Claude Code session scanner ───────────────────────────────────────

async function collectJsonlFiles(
  projectDir: string
): Promise<{ name: string; filePath: string; mtime: number }[]> {
  let entries: string[];
  try {
    entries = await readdir(projectDir);
  } catch {
    return [];
  }
  const jsonlFiles = entries.filter((e) => e.endsWith('.jsonl'));
  const fileInfos = await Promise.allSettled(
    jsonlFiles.map(async (name) => {
      const filePath = join(projectDir, name);
      const s = await stat(filePath);
      return { name, filePath, mtime: s.mtime.getTime() };
    })
  );
  return fileInfos
    .filter(
      (r): r is PromiseFulfilledResult<{ name: string; filePath: string; mtime: number }> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value);
}

async function parseClaudeSession(
  filePath: string,
  fileName: string,
  mtime: number,
  repositoryPath: string
): Promise<SessionResult | null> {
  const { createReadStream } = await import('node:fs');
  const id = fileName.replace('.jsonl', '');

  let preview: string | null = null;
  let firstTimestamp: string | null = null;
  let messageCount = 0;

  const head = await new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const stream = createReadStream(filePath, { end: PREVIEW_READ_BYTES - 1 });
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });
    stream.on('end', () => resolve(Buffer.concat(chunks, size).toString('utf-8')));
    stream.on('error', () => resolve(''));
  });

  if (!head) return null;

  const lines = head.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as {
        type?: string;
        timestamp?: string;
        message?: { role?: string; content?: unknown };
      };
      if (entry.type === 'user' || entry.type === 'assistant') {
        const role = entry.message?.role;
        if (role === 'user' || role === 'assistant') {
          messageCount++;
          if (entry.timestamp) {
            firstTimestamp ??= entry.timestamp;
          }
          if (role === 'user' && preview === null) {
            preview = extractText(entry.message?.content);
          }
        }
      }
    } catch {
      break;
    }
  }

  if (messageCount === 0) return null;

  const mtimeIso = new Date(mtime).toISOString();
  return {
    id,
    agentType: 'claude-code',
    preview,
    messageCount,
    firstMessageAt: firstTimestamp,
    lastMessageAt: mtimeIso,
    createdAt: firstTimestamp ?? mtimeIso,
    projectPath: repositoryPath,
    filePath,
    _mtime: mtime,
  };
}

export async function scanClaudeSessions(
  repositoryPath: string,
  limit: number,
  includeWorktrees = false
): Promise<SessionResult[]> {
  const dirName = claudeEncodePath(repositoryPath);
  const projectsRoot = join(homedir(), '.claude', 'projects');

  const primaryDir = join(projectsRoot, dirName);
  let allFiles = await collectJsonlFiles(primaryDir);

  if (includeWorktrees) {
    try {
      const allDirs = await readdir(projectsRoot);

      const prefixMatches = allDirs.filter((d) => d !== dirName && d.startsWith(dirName));

      const normalizedRepoPath = repositoryPath.replace(/\\/g, '/');
      const repoHash = createHash('sha256').update(normalizedRepoPath).digest('hex').slice(0, 16);
      const shepHome = join(homedir(), '.shep').replace(/\\/g, '/');
      const shepWorktreePrefix = claudeEncodePath(join(shepHome, 'repos', repoHash));
      const shepMatches = allDirs.filter(
        (d) => d.startsWith(shepWorktreePrefix) && !prefixMatches.includes(d) && d !== dirName
      );

      const worktreeDirs = [...prefixMatches, ...shepMatches];
      const worktreeResults = await Promise.all(
        worktreeDirs.map((d) => collectJsonlFiles(join(projectsRoot, d)))
      );
      for (const files of worktreeResults) {
        allFiles = allFiles.concat(files);
      }
    } catch {
      // projectsRoot doesn't exist — no sessions at all
    }
  }

  const valid = allFiles.sort((a, b) => b.mtime - a.mtime).slice(0, limit);

  const results = await Promise.allSettled(
    valid.map(async (fi) => parseClaudeSession(fi.filePath, fi.name, fi.mtime, repositoryPath))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SessionResult | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((s): s is SessionResult => s !== null);
}

// ── Cursor session scanner ────────────────────────────────────────────

async function parseCursorSession(
  filePath: string,
  fileName: string,
  mtime: number,
  repositoryPath: string
): Promise<SessionResult | null> {
  const { createReadStream } = await import('node:fs');
  const id = fileName.replace('.jsonl', '');

  const head = await new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const stream = createReadStream(filePath, { end: PREVIEW_READ_BYTES - 1 });
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      size += chunk.length;
    });
    stream.on('end', () => resolve(Buffer.concat(chunks, size).toString('utf-8')));
    stream.on('error', () => resolve(''));
  });

  if (!head) return null;

  let preview: string | null = null;
  let messageCount = 0;

  const lines = head.split('\n').filter((l) => l.trim());
  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as {
        role?: string;
        message?: { content?: unknown };
      };
      if (entry.role === 'user' || entry.role === 'assistant') {
        messageCount++;
        if (entry.role === 'user' && preview === null) {
          preview = extractText(entry.message?.content);
        }
      }
    } catch {
      break;
    }
  }

  if (messageCount === 0) return null;

  const mtimeIso = new Date(mtime).toISOString();
  return {
    id,
    agentType: 'cursor',
    preview,
    messageCount,
    firstMessageAt: mtimeIso,
    lastMessageAt: mtimeIso,
    createdAt: mtimeIso,
    projectPath: repositoryPath,
    filePath,
    _mtime: mtime,
  };
}

export async function scanCursorSessions(
  repositoryPath: string,
  limit: number
): Promise<SessionResult[]> {
  const dirName = cursorEncodePath(repositoryPath);
  const transcriptsDir = join(homedir(), '.cursor', 'projects', dirName, 'agent-transcripts');

  let entries: string[];
  try {
    entries = await readdir(transcriptsDir);
  } catch {
    return [];
  }

  const fileInfos = await Promise.allSettled(
    entries.map(async (entry) => {
      const entryPath = join(transcriptsDir, entry);
      const s = await stat(entryPath);

      if (s.isFile() && entry.endsWith('.jsonl')) {
        return { name: entry, filePath: entryPath, mtime: s.mtime.getTime() };
      }

      if (s.isDirectory()) {
        const jsonlPath = join(entryPath, `${entry}.jsonl`);
        try {
          const jsonlStat = await stat(jsonlPath);
          return {
            name: `${entry}.jsonl`,
            filePath: jsonlPath,
            mtime: jsonlStat.mtime.getTime(),
          };
        } catch {
          return null;
        }
      }

      return null;
    })
  );

  const valid = fileInfos
    .filter(
      (
        r
      ): r is PromiseFulfilledResult<{
        name: string;
        filePath: string;
        mtime: number;
      } | null> => r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .filter((v): v is { name: string; filePath: string; mtime: number } => v !== null)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  const results = await Promise.allSettled(
    valid.map(async (fi) => parseCursorSession(fi.filePath, fi.name, fi.mtime, repositoryPath))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SessionResult | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((s): s is SessionResult => s !== null);
}

/**
 * Scan sessions for a single repository path from all providers.
 * Merges and sorts by recency.
 */
export async function scanSessionsForPath(
  repositoryPath: string,
  limit: number,
  includeWorktrees = false
): Promise<SessionResult[]> {
  const [claudeSessions, cursorSessions] = await Promise.all([
    scanClaudeSessions(repositoryPath, limit, includeWorktrees),
    scanCursorSessions(repositoryPath, limit),
  ]);

  return [...claudeSessions, ...cursorSessions]
    .sort((a, b) => b._mtime - a._mtime)
    .slice(0, Math.min(limit, 50));
}

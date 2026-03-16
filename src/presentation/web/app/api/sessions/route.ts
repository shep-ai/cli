import { NextResponse } from 'next/server';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readdir, stat } from 'node:fs/promises';

export const dynamic = 'force-dynamic';

interface SessionResult {
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

// ── Claude Code session scanner ───────────────────────────────────────

async function scanClaudeSessions(repositoryPath: string, limit: number): Promise<SessionResult[]> {
  const dirName = claudeEncodePath(repositoryPath);
  const projectDir = join(homedir(), '.claude', 'projects', dirName);

  let files: string[];
  try {
    const entries = await readdir(projectDir);
    files = entries.filter((e) => e.endsWith('.jsonl'));
  } catch {
    return [];
  }

  // Stat all files for mtime sorting
  const fileInfos = await Promise.allSettled(
    files.map(async (name) => {
      const filePath = join(projectDir, name);
      const s = await stat(filePath);
      return { name, filePath, mtime: s.mtime.getTime() };
    })
  );

  const valid = fileInfos
    .filter(
      (r): r is PromiseFulfilledResult<{ name: string; filePath: string; mtime: number }> =>
        r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, limit);

  // Parse each file
  const results = await Promise.allSettled(
    valid.map(async (fi) => parseClaudeSession(fi.filePath, fi.name, fi.mtime, repositoryPath))
  );

  return results
    .filter((r): r is PromiseFulfilledResult<SessionResult | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((s): s is SessionResult => s !== null);
}

/**
 * Read the first N bytes of a file to extract preview and timestamps
 * without loading the entire (potentially multi-MB) session file.
 */
const PREVIEW_READ_BYTES = 8_192; // 8KB is enough for first few messages

async function parseClaudeSession(
  filePath: string,
  fileName: string,
  mtime: number,
  repositoryPath: string
): Promise<SessionResult | null> {
  const { createReadStream } = await import('node:fs');
  const id = fileName.replace('.jsonl', '');

  // Read only the first chunk to extract preview and first timestamp
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

  // Use mtime as lastMessageAt — avoids reading entire file for last line
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

// ── Cursor session scanner ────────────────────────────────────────────

async function scanCursorSessions(repositoryPath: string, limit: number): Promise<SessionResult[]> {
  const dirName = cursorEncodePath(repositoryPath);
  const transcriptsDir = join(homedir(), '.cursor', 'projects', dirName, 'agent-transcripts');

  let entries: string[];
  try {
    entries = await readdir(transcriptsDir);
  } catch {
    return [];
  }

  // Cursor has two session structures:
  // 1. Flat: agent-transcripts/<uuid>.jsonl
  // 2. Nested: agent-transcripts/<uuid>/<uuid>.jsonl
  const fileInfos = await Promise.allSettled(
    entries.map(async (entry) => {
      const entryPath = join(transcriptsDir, entry);
      const s = await stat(entryPath);

      if (s.isFile() && entry.endsWith('.jsonl')) {
        // Flat structure
        return { name: entry, filePath: entryPath, mtime: s.mtime.getTime() };
      }

      if (s.isDirectory()) {
        // Nested structure — look for <uuid>.jsonl inside
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

async function parseCursorSession(
  filePath: string,
  fileName: string,
  mtime: number,
  repositoryPath: string
): Promise<SessionResult | null> {
  const { createReadStream } = await import('node:fs');
  const id = fileName.replace('.jsonl', '');

  // Read only the first chunk for preview extraction
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

// ── Route handler ─────────────────────────────────────────────────────

/**
 * GET /api/sessions?repositoryPath=<path>&limit=<n>
 *
 * Returns agent sessions from all supported providers (Claude Code, Cursor)
 * filtered by repository path, merged and sorted by recency.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const repositoryPath = url.searchParams.get('repositoryPath');
  const limit = parseInt(url.searchParams.get('limit') ?? '10', 10);

  if (!repositoryPath?.trim()) {
    return NextResponse.json({ error: 'repositoryPath is required' }, { status: 400 });
  }

  try {
    // Scan all providers in parallel
    const [claudeSessions, cursorSessions] = await Promise.all([
      scanClaudeSessions(repositoryPath, limit),
      scanCursorSessions(repositoryPath, limit),
    ]);

    // Merge and sort by mtime descending, apply limit
    const allSessions = [...claudeSessions, ...cursorSessions]
      .sort((a, b) => b._mtime - a._mtime)
      .slice(0, Math.min(limit, 50));

    return NextResponse.json({
      sessions: allSessions.map(({ _mtime, ...s }) => s),
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API] GET /api/sessions error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

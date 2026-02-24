/**
 * Claude Code Session Repository
 *
 * Infrastructure implementation of IAgentSessionRepository for Claude Code.
 * Reads JSONL session files from ~/.claude/projects/ using a lazy stat-then-parse
 * strategy for performance: stat all files in parallel for mtime-based sorting,
 * then fully parse only the top-N files needed for the list view.
 *
 * File structure:
 *   ~/.claude/projects/<encoded-project-path>/<uuid>.jsonl
 *
 * Subagent sessions stored in subdirectories are excluded by only reading
 * depth-1 .jsonl files from each project directory.
 */

import * as fs from 'node:fs/promises';
import type { Dirent } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { injectable } from 'tsyringe';
import type {
  AgentSession,
  AgentSessionMessage,
  AgentType,
} from '../../../../domain/generated/output.js';
import type {
  IAgentSessionRepository,
  ListSessionsOptions,
  GetSessionOptions,
} from '../../../../application/ports/output/agents/agent-session-repository.interface.js';

interface SessionFileInfo {
  id: string;
  filePath: string;
  mtime: Date;
}

/**
 * A parsed line entry from a Claude Code JSONL session file.
 */
interface JournalEntry {
  uuid?: string;
  parentUuid?: string;
  sessionId?: string;
  timestamp?: string;
  cwd?: string;
  gitBranch?: string;
  version?: string;
  isSidechain?: boolean;
  type: string;
  message?: {
    role?: string;
    content?: unknown;
  };
}

@injectable()
export class ClaudeCodeSessionRepository implements IAgentSessionRepository {
  constructor(private readonly basePath: string = path.join(os.homedir(), '.claude', 'projects')) {}

  isSupported(): boolean {
    return true;
  }

  async list(options?: ListSessionsOptions): Promise<AgentSession[]> {
    const limit = options?.limit ?? 20;

    const fileInfos = await this.collectSessionFiles();
    fileInfos.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    const topFiles = limit === 0 ? fileInfos : fileInfos.slice(0, limit);

    const sessions: AgentSession[] = [];
    for (const fileInfo of topFiles) {
      try {
        const session = await this.parseSessionFile(fileInfo, { includeMessages: false });
        if (session !== null) {
          sessions.push(session);
        }
      } catch {
        // Malformed or unreadable file — skip silently
      }
    }

    return sessions;
  }

  async findById(id: string, options?: GetSessionOptions): Promise<AgentSession | null> {
    const messageLimit = options?.messageLimit ?? 20;

    const filePath = await this.findSessionFile(id);
    if (filePath === null) return null;

    try {
      const stat = await fs.stat(filePath);
      const fileInfo: SessionFileInfo = { id, filePath, mtime: stat.mtime };
      return await this.parseSessionFile(fileInfo, { includeMessages: true, messageLimit });
    } catch {
      return null;
    }
  }

  /** Collect all depth-1 .jsonl session files with mtime from all project directories */
  private async collectSessionFiles(): Promise<SessionFileInfo[]> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(this.basePath, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      return [];
    }

    const projectDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(this.basePath, e.name));

    const results = await Promise.allSettled(
      projectDirs.map((dir) => this.collectDepthOneJsonlFiles(dir))
    );

    const fileInfos: SessionFileInfo[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        fileInfos.push(...result.value);
      }
    }
    return fileInfos;
  }

  /** Collect depth-1 .jsonl files from a single project directory with stat for mtime */
  private async collectDepthOneJsonlFiles(projectDir: string): Promise<SessionFileInfo[]> {
    const entries = await fs.readdir(projectDir, { withFileTypes: true, encoding: 'utf-8' });
    const jsonlFiles = entries.filter((e) => e.isFile() && e.name.endsWith('.jsonl'));

    const statResults = await Promise.allSettled(
      jsonlFiles.map(async (e) => {
        const filePath = path.join(projectDir, e.name);
        const stat = await fs.stat(filePath);
        const id = e.name.slice(0, -'.jsonl'.length);
        return { id, filePath, mtime: stat.mtime } satisfies SessionFileInfo;
      })
    );

    const fileInfos: SessionFileInfo[] = [];
    for (const result of statResults) {
      if (result.status === 'fulfilled') {
        fileInfos.push(result.value);
      }
    }
    return fileInfos;
  }

  /** Find a session file by ID, scanning all project directories */
  private async findSessionFile(id: string): Promise<string | null> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(this.basePath, { withFileTypes: true, encoding: 'utf-8' });
    } catch {
      return null;
    }

    const projectDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(this.basePath, e.name));

    for (const dir of projectDirs) {
      const filePath = path.join(dir, `${id}.jsonl`);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        // Not in this directory, continue scanning
      }
    }

    return null;
  }

  /**
   * Parse a JSONL session file into an AgentSession.
   *
   * Throws on any JSON parse failure so the caller can skip the file.
   */
  private async parseSessionFile(
    fileInfo: SessionFileInfo,
    options: { includeMessages: boolean; messageLimit?: number }
  ): Promise<AgentSession | null> {
    const content = await fs.readFile(fileInfo.filePath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    let cwd: string | undefined;
    let firstMessageAt: Date | undefined;
    let lastMessageAt: Date | undefined;
    let preview: string | undefined;
    let messageCount = 0;
    const messages: AgentSessionMessage[] = [];

    for (const line of lines) {
      // JSON.parse throws on invalid JSON — propagates to caller which skips the file
      const entry = JSON.parse(line) as JournalEntry;

      if (!cwd && typeof entry.cwd === 'string') {
        cwd = entry.cwd;
      }

      if (entry.type === 'user' || entry.type === 'assistant') {
        const message = entry.message;
        const role = message?.role;
        if (role === 'user' || role === 'assistant') {
          messageCount++;

          const timestamp = entry.timestamp ? new Date(entry.timestamp) : fileInfo.mtime;

          firstMessageAt ??= timestamp;
          lastMessageAt = timestamp;

          if (entry.type === 'user' && preview === undefined) {
            preview = this.extractTextContent(message?.content);
          }

          if (options.includeMessages) {
            messages.push({
              uuid: entry.uuid ?? '',
              role: role as 'user' | 'assistant',
              content: this.extractTextContent(message?.content),
              timestamp,
            });
          }
        }
      }
    }

    if (cwd === undefined) {
      // Could not determine project path — file is too sparse to be useful
      return null;
    }

    let messagesToReturn = messages;
    if (options.includeMessages && options.messageLimit !== undefined && options.messageLimit > 0) {
      messagesToReturn = messages.slice(-options.messageLimit);
    }

    const session: AgentSession = {
      id: fileInfo.id,
      agentType: 'claude-code' as AgentType,
      projectPath: this.abbreviatePath(cwd),
      messageCount,
      createdAt: firstMessageAt ?? fileInfo.mtime,
      updatedAt: lastMessageAt ?? fileInfo.mtime,
    };

    if (preview !== undefined) {
      session.preview = preview;
    }
    if (firstMessageAt !== undefined) {
      session.firstMessageAt = firstMessageAt;
    }
    if (lastMessageAt !== undefined) {
      session.lastMessageAt = lastMessageAt;
    }
    if (options.includeMessages) {
      session.messages = messagesToReturn;
    }

    return session;
  }

  /**
   * Extract plain text from message content.
   * - string content: returned as-is
   * - array content: first text-type block's text is returned
   */
  private extractTextContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      const textBlock = content.find(
        (block): block is { type: string; text: string } =>
          typeof block === 'object' &&
          block !== null &&
          (block as { type?: unknown }).type === 'text' &&
          typeof (block as { text?: unknown }).text === 'string'
      );
      if (textBlock) {
        return textBlock.text;
      }
    }
    return '';
  }

  /** Replace home directory prefix with ~ in a file path */
  private abbreviatePath(filePath: string): string {
    const home = os.homedir();
    if (filePath === home) return '~';
    if (filePath.startsWith(`${home}/`)) {
      return `~${filePath.slice(home.length)}`;
    }
    return filePath;
  }
}

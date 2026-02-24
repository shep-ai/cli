/**
 * Session List Command
 *
 * List agent provider CLI sessions for the configured or specified provider.
 * Displays session ID, project path, message count, last active time, and preview.
 *
 * Usage:
 *   shep session ls
 *   shep session ls --claude-code
 *   shep session ls --cursor-cli
 *   shep session ls --gemini-cli
 *   shep session ls --limit 10
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { ListAgentSessionsUseCase } from '@/application/use-cases/agents/list-agent-sessions.use-case.js';
import { colors, messages, renderListView } from '../../ui/index.js';
import type { AgentSession } from '@/domain/generated/output.js';
import { AgentType } from '@/domain/generated/output.js';

export function createLsCommand(): Command {
  return new Command('ls')
    .description('List agent provider CLI sessions')
    .option('--claude-code', 'List sessions for Claude Code')
    .option('--cursor-cli', 'List sessions for Cursor CLI')
    .option('--gemini-cli', 'List sessions for Gemini CLI')
    .option('-n, --limit <n>', 'Maximum number of sessions to show (0 = all)', '20')
    .action(async (opts) => {
      try {
        // Validate mutual exclusivity of provider flags
        const providerFlags = [opts.claudeCode, opts.cursorCli, opts.geminiCli].filter(Boolean);
        if (providerFlags.length > 1) {
          messages.error('Only one provider flag may be specified at a time');
          process.exitCode = 1;
          return;
        }

        const agentType = resolveAgentType(opts);
        const limit = parseInt(opts.limit, 10);

        const useCase = container.resolve(ListAgentSessionsUseCase);
        const sessions = await useCase.execute({ agentType, limit });

        const rows = sessions.map((session) => [
          session.id.substring(0, 8),
          session.projectPath,
          String(session.messageCount),
          formatRelativeTime(session.lastMessageAt ?? session.updatedAt),
          session.preview ? truncate(session.preview, 50) : colors.muted('-'),
        ]);

        renderListView({
          title: 'Agent Sessions',
          columns: [
            { label: 'ID', width: 10 },
            { label: 'Path', width: 37 },
            { label: 'Messages', width: 12 },
            { label: 'Last Active', width: 18 },
            { label: 'Preview', width: 52 },
          ],
          rows,
          emptyMessage: 'No sessions found',
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to list sessions', err);
        process.exitCode = 1;
      }
    });
}

function resolveAgentType(opts: {
  claudeCode?: boolean;
  cursorCli?: boolean;
  geminiCli?: boolean;
}): AgentType | undefined {
  if (opts.claudeCode) return AgentType.ClaudeCode;
  if (opts.cursorCli) return AgentType.Cursor;
  if (opts.geminiCli) return AgentType.GeminiCli;
  return undefined;
}

export function formatRelativeTime(date: Date | string | undefined): string {
  if (!date) return colors.muted('-');

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return colors.muted('-');

  const diffMs = Date.now() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMinutes > 0) return `${diffMinutes}m ago`;
  return 'just now';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength - 1)}…`;
}

export type { AgentSession };

/**
 * Session Show Command
 *
 * Display details of a specific agent provider CLI session including metadata
 * and conversation messages.
 *
 * Usage:
 *   shep session show <id>
 *   shep session show <id> --messages 50
 *   shep session show <id> --claude-code
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { GetAgentSessionUseCase } from '@/application/use-cases/agents/get-agent-session.use-case.js';
import { SessionNotFoundError } from '@/domain/errors/session-not-found.error.js';
import { colors, messages, renderDetailView } from '../../ui/index.js';
import type { AgentSession, AgentSessionMessage } from '@/domain/generated/output.js';
import { AgentType } from '@/domain/generated/output.js';
import { formatRelativeTime } from './ls.command.js';

export function createShowCommand(): Command {
  return new Command('show')
    .description('Display details of an agent provider session')
    .argument('<id>', 'Session ID')
    .option('--claude-code', 'Query Claude Code sessions')
    .option('--cursor-cli', 'Query Cursor CLI sessions')
    .option('--gemini-cli', 'Query Gemini CLI sessions')
    .option('-m, --messages <n>', 'Number of messages to display (0 = all)', '20')
    .action(async (id: string, opts) => {
      try {
        // Validate mutual exclusivity of provider flags
        const providerFlags = [opts.claudeCode, opts.cursorCli, opts.geminiCli].filter(Boolean);
        if (providerFlags.length > 1) {
          messages.error('Only one provider flag may be specified at a time');
          process.exitCode = 1;
          return;
        }

        const agentType = resolveAgentType(opts);
        const messageLimit = parseInt(opts.messages, 10);

        const useCase = container.resolve(GetAgentSessionUseCase);
        const session = await useCase.execute({ id, agentType, messageLimit });

        renderSessionDetail(session, messageLimit);
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          messages.error(`Session not found: ${error.message}`);
          process.exitCode = 1;
          return;
        }
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to show session', err);
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

function renderSessionDetail(session: AgentSession, _messageLimit: number): void {
  const sessionMessages = session.messages ?? [];
  const displayedCount = sessionMessages.length;
  const totalCount = session.messageCount;

  renderDetailView({
    title: 'Session',
    sections: [
      {
        fields: [
          { label: 'ID', value: session.id },
          { label: 'Provider', value: session.agentType },
          { label: 'Project Path', value: session.projectPath },
          { label: 'Message Count', value: String(session.messageCount) },
          {
            label: 'First Active',
            value: session.firstMessageAt ? formatDate(session.firstMessageAt) : null,
          },
          {
            label: 'Last Active',
            value: formatRelativeTime(session.lastMessageAt ?? session.updatedAt),
          },
        ],
      },
    ],
  });

  if (sessionMessages.length === 0) {
    messages.info('No messages in this session');
    return;
  }

  // Show truncation note when not displaying all messages
  if (displayedCount < totalCount) {
    messages.info(`Showing last ${displayedCount} of ${totalCount} messages`);
  }

  renderMessages(sessionMessages);
}

function renderMessages(msgs: AgentSessionMessage[]): void {
  const lines: string[] = [''];
  for (const msg of msgs) {
    const timestamp = formatDate(msg.timestamp);
    const timeStr = timestamp ? colors.muted(` (${timestamp})`) : '';

    if (msg.role === 'user') {
      lines.push(`  ${colors.info('You')}${timeStr}`);
    } else {
      lines.push(`  ${colors.success('Assistant')}${timeStr}`);
    }

    for (const line of msg.content.split('\n')) {
      lines.push(`  ${line}`);
    }
    lines.push('');
  }
  console.log(lines.join('\n'));
}

function formatDate(date: Date | string | undefined): string | null {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date as string);
    return d.toLocaleString();
  } catch {
    return String(date);
  }
}

/**
 * POC: Persistent interactive agent using @anthropic-ai/claude-agent-sdk V2
 *
 * Proves: single session object, multiple send()/stream() turns,
 * same PID, conversation context preserved across turns.
 *
 * Usage:
 *   npx tsx poc-agent-sdk.ts
 */

import {
  unstable_v2_createSession,
  type SDKMessage,
} from '@anthropic-ai/claude-agent-sdk';
import * as readline from 'node:readline';

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractText(msg: SDKMessage): string | null {
  if (msg.type !== 'assistant') return null;
  return (msg as any).message.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Creating session...');

  const session = unstable_v2_createSession({
    model: 'claude-sonnet-4-6',
    permissionMode: 'bypassPermissions',
  });

  let sessionId: string | undefined;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const prompt = (): Promise<string> =>
    new Promise((resolve) => rl.question('\n\x1b[35mYou:\x1b[0m ', resolve));

  console.log('Session created. Type messages, Ctrl+C to quit.\n');

  // Interactive loop — same session object, multiple turns
  while (true) {
    const userInput = await prompt();
    if (!userInput.trim()) continue;

    // Send user message to the SAME session
    await session.send(userInput);

    // Stream response from the SAME session
    process.stdout.write('\x1b[36mAgent:\x1b[0m ');
    for await (const msg of session.stream()) {
      // Capture session ID from first system message
      if (!sessionId && msg.session_id) {
        sessionId = msg.session_id;
        console.log(`\n  [session: ${sessionId}]`);
      }

      // Print assistant text as it streams
      const text = extractText(msg);
      if (text) {
        process.stdout.write(text);
      }

      // Show tool use events
      if (msg.type === 'tool_use') {
        const tu = msg as any;
        process.stdout.write(`\n  [tool: ${tu.name || tu.tool_name || '?'}]`);
      }
    }
    console.log(); // newline after response
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});

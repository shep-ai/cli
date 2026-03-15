import { describe, it, expect } from 'vitest';
import {
  parseLogLine,
  parseLogContent,
  parseToolCall,
  parseResultMessage,
  parseTokensMessage,
} from '@/lib/parse-log-line';

describe('parseLogLine', () => {
  it('parses a tool event with phase, agent, and model', () => {
    const line =
      '[2026-03-08T10:00:08.234Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/main.ts"}';
    const result = parseLogLine(line);

    expect(result.timestamp).toBe('2026-03-08T10:00:08.234Z');
    expect(result.phase).toBe('requirements');
    expect(result.agent).toBe('claude-code');
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.tag).toBe('tool');
    expect(result.message).toBe('Read {"file_path": "src/main.ts"}');
  });

  it('parses a text event', () => {
    const line =
      '[2026-03-08T10:00:10.345Z] [requirements] [claude-code|claude-sonnet-4-6] [text] Analyzing the codebase';
    const result = parseLogLine(line);

    expect(result.tag).toBe('text');
    expect(result.message).toBe('Analyzing the codebase');
    expect(result.phase).toBe('requirements');
  });

  it('parses a result event', () => {
    const line =
      '[2026-03-08T10:00:45.789Z] [requirements] [claude-code|claude-sonnet-4-6] [result] 8920 chars, session=sess-abc123';
    const result = parseLogLine(line);

    expect(result.tag).toBe('result');
    expect(result.message).toBe('8920 chars, session=sess-abc123');
  });

  it('parses a tokens event', () => {
    const line =
      '[2026-03-08T10:00:45.790Z] [requirements] [claude-code|claude-sonnet-4-6] [tokens] 2450 in / 4560 out';
    const result = parseLogLine(line);

    expect(result.tag).toBe('tokens');
    expect(result.message).toBe('2450 in / 4560 out');
  });

  it('parses a WORKER event', () => {
    const line =
      '[2026-03-08T10:00:01.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting worker — full command:';
    const result = parseLogLine(line);

    expect(result.tag).toBe('worker');
    expect(result.phase).toBeNull();
    expect(result.agent).toBe('claude-code');
    expect(result.model).toBe('claude-sonnet-4-6');
    expect(result.message).toBe('Starting worker — full command:');
  });

  it('parses an info line (no tag)', () => {
    const line =
      '[2026-03-08T10:00:05.000Z] [requirements] [claude-code|claude-sonnet-4-6] Starting...';
    const result = parseLogLine(line);

    expect(result.tag).toBe('info');
    expect(result.message).toBe('Starting...');
    expect(result.phase).toBe('requirements');
  });

  it('returns raw for unparseable lines', () => {
    const line = 'Some random unstructured output';
    const result = parseLogLine(line);

    expect(result.tag).toBe('raw');
    expect(result.message).toBe('Some random unstructured output');
    expect(result.timestamp).toBeNull();
    expect(result.phase).toBeNull();
    expect(result.agent).toBeNull();
  });

  it('handles empty string', () => {
    const result = parseLogLine('');
    expect(result.tag).toBe('raw');
    expect(result.message).toBe('');
  });
});

describe('parseToolCall', () => {
  it('parses tool name and JSON args', () => {
    const result = parseToolCall('Read {"file_path": "src/main.ts"}');
    expect(result.toolName).toBe('Read');
    expect(result.args).toBe('{"file_path": "src/main.ts"}');
  });

  it('handles tool name only (no args)', () => {
    const result = parseToolCall('SomeCustomTool');
    expect(result.toolName).toBe('SomeCustomTool');
    expect(result.args).toBe('');
  });
});

describe('parseResultMessage', () => {
  it('parses chars and session', () => {
    const result = parseResultMessage('8920 chars, session=sess-abc123');
    expect(result.chars).toBe(8920);
    expect(result.sessionId).toBe('sess-abc123');
  });

  it('handles missing session', () => {
    const result = parseResultMessage('500 chars');
    expect(result.chars).toBe(500);
    expect(result.sessionId).toBeNull();
  });

  it('handles unparseable input', () => {
    const result = parseResultMessage('unknown format');
    expect(result.chars).toBe(0);
    expect(result.sessionId).toBeNull();
  });
});

describe('parseTokensMessage', () => {
  it('parses input and output tokens', () => {
    const result = parseTokensMessage('2450 in / 4560 out');
    expect(result.inputTokens).toBe(2450);
    expect(result.outputTokens).toBe(4560);
  });

  it('handles unparseable input', () => {
    const result = parseTokensMessage('unknown');
    expect(result.inputTokens).toBe(0);
    expect(result.outputTokens).toBe(0);
  });
});

describe('parseLogContent', () => {
  it('parses multiple lines', () => {
    const content = `[2026-03-08T10:00:01.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting worker
[2026-03-08T10:00:08.234Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/main.ts"}
Some raw output`;

    const lines = parseLogContent(content);
    expect(lines).toHaveLength(3);
    expect(lines[0].tag).toBe('worker');
    expect(lines[1].tag).toBe('tool');
    expect(lines[2].tag).toBe('raw');
  });

  it('filters empty lines', () => {
    const content = 'line1\n\n\nline2\n';
    const lines = parseLogContent(content);
    expect(lines).toHaveLength(2);
  });

  it('returns empty array for empty content', () => {
    expect(parseLogContent('')).toHaveLength(0);
  });
});

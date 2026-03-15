/**
 * Parses structured log lines from the feature agent worker process.
 *
 * Log format: [timestamp] [phase] [agent|model] [tag] message
 * Worker format: [timestamp] [agent|model] [WORKER] message
 * Fallback: raw string lines
 */

export type LogEventTag = 'tool' | 'text' | 'result' | 'tokens' | 'raw' | 'worker' | 'info';

export interface ParsedLogLine {
  /** ISO timestamp */
  timestamp: string | null;
  /** Phase name (e.g. "requirements", "implement") */
  phase: string | null;
  /** Agent type (e.g. "claude-code") */
  agent: string | null;
  /** Model name (e.g. "claude-haiku-4-5") */
  model: string | null;
  /** Event tag */
  tag: LogEventTag;
  /** The message content after tags */
  message: string;
  /** Original raw line */
  raw: string;
  /** Unique identifier for keying in lists */
  id: string;
}

/**
 * Regex to match structured log lines.
 * Captures: timestamp, optional phase, optional agent|model, rest of message
 *
 * Examples:
 * [2026-03-08T10:00:01.123Z] [requirements] [claude-code|claude-haiku-4-5] [tool] Read {"path":"f.ts"}
 * [2026-03-08T10:00:01.123Z] [claude-code|claude-haiku-4-5] [WORKER] Starting worker
 * [2026-03-08T10:00:01.123Z] [requirements] [claude-code|claude-haiku-4-5] Starting...
 */
const LOG_LINE_REGEX =
  /^\[(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\]\s+(?:\[([^\]]+)\]\s+)?(?:\[([^\]|]+)(?:\|([^\]]+))?\]\s+)?(.*)$/;

const TAG_REGEX = /^\[(tool|text|result|tokens|raw|WORKER)\]\s*(.*)/;

export function parseLogLine(raw: string): Omit<ParsedLogLine, 'id'> {
  const match = raw.match(LOG_LINE_REGEX);

  if (!match) {
    return {
      timestamp: null,
      phase: null,
      agent: null,
      model: null,
      tag: 'raw',
      message: raw,
      raw,
    };
  }

  const [, timestamp, group1, group2, group3, rest] = match;

  // Determine phase, agent, model from the captured groups.
  // The log format can be:
  //   [ts] [phase] [agent|model] message       → group1=phase, group2=agent, group3=model
  //   [ts] [agent|model] [WORKER] message      → group1="agent|model", group2=WORKER
  //   [ts] [phase] [agent] message             → group1=phase, group2=agent
  //   [ts] [phase] message                     → group1=phase only
  let phase: string | null = null;
  let agent: string | null = null;
  let model: string | null = null;
  let message = rest ?? '';

  if (group2 != null && group1 != null) {
    // Two bracket groups captured
    if (group1.includes('|')) {
      // group1 is [agent|model], group2 is next tag (e.g. WORKER)
      const [agentPart, modelPart] = group1.split('|');
      agent = agentPart;
      model = modelPart ?? null;
      // group2 becomes part of the message to be parsed as a tag
      message = `[${group2}] ${rest ?? ''}`;
    } else {
      // group1 is [phase], group2|group3 is [agent|model]
      phase = group1;
      agent = group2;
      model = group3 ?? null;
    }
  } else if (group1 != null) {
    // Only one bracket group
    if (group1.includes('|')) {
      const [agentPart, modelPart] = group1.split('|');
      agent = agentPart;
      model = modelPart ?? null;
    } else {
      phase = group1;
    }
  }

  // Parse tag from message
  const tagMatch = message.match(TAG_REGEX);
  let tag: LogEventTag = 'info';

  if (tagMatch) {
    tag = tagMatch[1].toLowerCase() as LogEventTag;
    message = tagMatch[2];
  }

  return {
    timestamp: timestamp ?? null,
    phase,
    agent,
    model,
    tag,
    message: message.trim(),
    raw,
  };
}

/** Tool call info extracted from [tool] messages */
export interface ToolCallInfo {
  toolName: string;
  args: string;
}

/** Parse a [tool] message into tool name and args */
export function parseToolCall(message: string): ToolCallInfo {
  const spaceIdx = message.indexOf(' ');
  if (spaceIdx === -1) {
    return { toolName: message, args: '' };
  }
  return {
    toolName: message.slice(0, spaceIdx),
    args: message.slice(spaceIdx + 1),
  };
}

/** Result info extracted from [result] messages */
export interface ResultInfo {
  chars: number;
  sessionId: string | null;
}

/** Parse a [result] message */
export function parseResultMessage(message: string): ResultInfo {
  const charsMatch = message.match(/^(\d+)\s+chars/);
  const sessionMatch = message.match(/session=(\S+)/);
  return {
    chars: charsMatch ? parseInt(charsMatch[1], 10) : 0,
    sessionId: sessionMatch ? sessionMatch[1] : null,
  };
}

/** Token info extracted from [tokens] messages */
export interface TokenInfo {
  inputTokens: number;
  outputTokens: number;
}

/** Parse a [tokens] message */
export function parseTokensMessage(message: string): TokenInfo {
  const match = message.match(/^(\d+)\s+in\s*\/\s*(\d+)\s+out/);
  if (!match) return { inputTokens: 0, outputTokens: 0 };
  return {
    inputTokens: parseInt(match[1], 10),
    outputTokens: parseInt(match[2], 10),
  };
}

/** Parse all lines from raw content string */
export function parseLogContent(content: string): ParsedLogLine[] {
  if (!content) return [];
  return content
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line, i) => ({ ...parseLogLine(line), id: `log-${i}` }));
}

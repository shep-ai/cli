import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- DI container mock ---
const mockExecuteStream = vi.fn();
const mockGetExecutor = vi.fn(() => ({
  executeStream: mockExecuteStream,
}));

vi.mock('@/lib/server-container', () => ({
  resolve: vi.fn(() => ({
    getExecutor: mockGetExecutor,
  })),
}));

import { resolve } from '@/lib/server-container';
import { POST } from '@/app/api/decision-chat/route';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost:3000/api/decision-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function readStream(response: Response): Promise<string[]> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    // Split by newlines to get individual JSON chunks
    const lines = text.split('\n').filter((line) => line.trim());
    chunks.push(...lines);
  }

  return chunks;
}

const validBody = {
  featureId: 'feat-123',
  reviewType: 'tech' as const,
  reviewContext: {
    name: 'My Feature',
    summary: 'A cool feature',
    decisions: [
      { title: 'DB Choice', chosen: 'PostgreSQL', rejected: ['MongoDB'], rationale: 'Best fit' },
    ],
    technologies: ['React', 'Node.js'],
  },
  messages: [{ role: 'user', content: 'Why did you choose PostgreSQL?' }],
};

describe('POST /api/decision-chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when featureId is missing', async () => {
    const response = await POST(makeRequest({ ...validBody, featureId: '' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/featureId/i);
  });

  it('returns 400 when featureId is whitespace only', async () => {
    const response = await POST(makeRequest({ ...validBody, featureId: '   ' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/featureId/i);
  });

  it('returns 400 when messages array is empty', async () => {
    const response = await POST(makeRequest({ ...validBody, messages: [] }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/messages/i);
  });

  it('returns 400 when messages is not an array', async () => {
    const response = await POST(makeRequest({ ...validBody, messages: 'not-an-array' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/messages/i);
  });

  it('resolves IAgentExecutorProvider via DI container', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'result', content: 'Done', timestamp: new Date() };
      })()
    );

    await POST(makeRequest(validBody));

    expect(resolve).toHaveBeenCalledWith('IAgentExecutorProvider');
    expect(mockGetExecutor).toHaveBeenCalled();
  });

  it('passes systemPrompt with review context to executeStream', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'result', content: 'Done', timestamp: new Date() };
      })()
    );

    await POST(makeRequest(validBody));

    expect(mockExecuteStream).toHaveBeenCalledTimes(1);
    const [prompt, options] = mockExecuteStream.mock.calls[0];

    // Prompt should contain the user message
    expect(prompt).toContain('Why did you choose PostgreSQL?');

    // System prompt should contain review context
    expect(options.systemPrompt).toContain('My Feature');
    expect(options.systemPrompt).toContain('A cool feature');
    expect(options.systemPrompt).toContain('PostgreSQL');
  });

  it('includes review type in system prompt', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'result', content: 'Done', timestamp: new Date() };
      })()
    );

    await POST(makeRequest({ ...validBody, reviewType: 'prd' }));

    const [, options] = mockExecuteStream.mock.calls[0];
    expect(options.systemPrompt).toContain('product');
  });

  it('streams progress events as newline-delimited JSON', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'progress', content: 'Hello', timestamp: new Date() };
        yield { type: 'progress', content: ' world', timestamp: new Date() };
        yield { type: 'result', content: 'Hello world', timestamp: new Date() };
      })()
    );

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');

    const chunks = await readStream(response);
    expect(chunks.length).toBe(3);

    const parsed = chunks.map((c) => JSON.parse(c));
    expect(parsed[0]).toMatchObject({ type: 'progress', content: 'Hello' });
    expect(parsed[1]).toMatchObject({ type: 'progress', content: ' world' });
    expect(parsed[2]).toMatchObject({ type: 'result', content: 'Hello world' });
  });

  it('streams error events from the executor', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'error', content: 'Agent failed', timestamp: new Date() };
      })()
    );

    const response = await POST(makeRequest(validBody));
    const chunks = await readStream(response);
    const parsed = JSON.parse(chunks[0]);

    expect(parsed).toMatchObject({ type: 'error', content: 'Agent failed' });
  });

  it('returns 500 when executor fails to resolve', async () => {
    (resolve as ReturnType<typeof vi.fn>).mockImplementationOnce(() => {
      throw new Error('DI container not available');
    });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('DI container not available');
  });

  it('formats multi-turn conversation history into prompt', async () => {
    mockExecuteStream.mockReturnValue(
      (async function* () {
        yield { type: 'result', content: 'Done', timestamp: new Date() };
      })()
    );

    const multiTurnBody = {
      ...validBody,
      messages: [
        { role: 'user', content: 'Why PostgreSQL?' },
        { role: 'assistant', content: 'Because it is reliable.' },
        { role: 'user', content: 'What about MongoDB?' },
      ],
    };

    await POST(makeRequest(multiTurnBody));

    const [prompt] = mockExecuteStream.mock.calls[0];
    expect(prompt).toContain('Why PostgreSQL?');
    expect(prompt).toContain('Because it is reliable.');
    expect(prompt).toContain('What about MongoDB?');
  });
});

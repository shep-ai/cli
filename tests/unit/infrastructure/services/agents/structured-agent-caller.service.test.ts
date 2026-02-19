import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StructuredAgentCallerService } from '@/infrastructure/services/agents/common/structured-agent-caller.service.js';
import { StructuredCallError } from '@/application/ports/output/agents/structured-call-error.js';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { IAgentExecutorProvider } from '@/application/ports/output/agents/agent-executor-provider.interface.js';
import { AgentFeature } from '@/domain/generated/output.js';

describe('StructuredAgentCallerService', () => {
  let service: StructuredAgentCallerService;
  let mockExecutor: IAgentExecutor;
  let mockProvider: IAgentExecutorProvider;

  const testSchema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      count: { type: 'number' },
    },
    required: ['name', 'count'],
    additionalProperties: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutor = {
      agentType: 'claude-code' as any,
      execute: vi.fn(),
      executeStream: vi.fn(),
      supportsFeature: vi.fn(),
    };
    mockProvider = {
      getExecutor: vi.fn().mockReturnValue(mockExecutor),
    };
    service = new StructuredAgentCallerService(mockProvider);
  });

  describe('native path (agent supports structured-output)', () => {
    beforeEach(() => {
      vi.mocked(mockExecutor.supportsFeature).mockReturnValue(true);
    });

    it('returns metadata.structured_output when available', async () => {
      const expected = { name: 'test', count: 42 };
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '',
        metadata: { structured_output: expected },
      });

      const result = await service.call<{ name: string; count: number }>(
        'extract data',
        testSchema
      );

      expect(result).toEqual(expected);
    });

    it('passes outputSchema in execute options', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"test","count":1}',
        metadata: { structured_output: { name: 'test', count: 1 } },
      });

      await service.call('extract data', testSchema);

      expect(mockExecutor.execute).toHaveBeenCalledWith(
        'extract data',
        expect.objectContaining({ outputSchema: testSchema })
      );
    });

    it('falls back to parsing result text when structured_output missing in metadata', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"fallback","count":7}',
        metadata: {},
      });

      const result = await service.call<{ name: string; count: number }>(
        'extract data',
        testSchema
      );

      expect(result).toEqual({ name: 'fallback', count: 7 });
    });

    it('forwards options (maxTurns, silent, etc.) to executor', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '',
        metadata: { structured_output: { name: 'x', count: 0 } },
      });

      await service.call('extract data', testSchema, {
        maxTurns: 5,
        silent: true,
        cwd: '/tmp',
      });

      expect(mockExecutor.execute).toHaveBeenCalledWith(
        'extract data',
        expect.objectContaining({
          maxTurns: 5,
          silent: true,
          cwd: '/tmp',
          outputSchema: testSchema,
        })
      );
    });
  });

  describe('prompt fallback path (agent does NOT support structured-output)', () => {
    beforeEach(() => {
      vi.mocked(mockExecutor.supportsFeature).mockReturnValue(false);
    });

    it('wraps prompt with JSON instructions when no native support', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"wrapped","count":3}',
      });

      await service.call('extract data', testSchema);

      const calledPrompt = vi.mocked(mockExecutor.execute).mock.calls[0][0];
      expect(calledPrompt).toContain('extract data');
      expect(calledPrompt).toContain('JSON');
    });

    it('does NOT pass outputSchema to executor', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"test","count":1}',
      });

      await service.call('extract data', testSchema);

      const calledOptions = vi.mocked(mockExecutor.execute).mock.calls[0][1];
      expect(calledOptions?.outputSchema).toBeUndefined();
    });

    it('parses JSON from text result', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"parsed","count":99}',
      });

      const result = await service.call<{ name: string; count: number }>(
        'extract data',
        testSchema
      );

      expect(result).toEqual({ name: 'parsed', count: 99 });
    });

    it('handles JSON wrapped in code fences', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: 'Here is the result:\n```json\n{"name":"fenced","count":5}\n```',
      });

      const result = await service.call<{ name: string; count: number }>(
        'extract data',
        testSchema
      );

      expect(result).toEqual({ name: 'fenced', count: 5 });
    });

    it('handles JSON with surrounding prose text', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result:
          'I analyzed the request and here is the output: {"name":"prose","count":12} Hope that helps!',
      });

      const result = await service.call<{ name: string; count: number }>(
        'extract data',
        testSchema
      );

      expect(result).toEqual({ name: 'prose', count: 12 });
    });
  });

  describe('error cases', () => {
    beforeEach(() => {
      vi.mocked(mockExecutor.supportsFeature).mockReturnValue(false);
    });

    it('throws StructuredCallError with parse_failed when no JSON in response', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: 'This response contains no JSON at all.',
      });

      await expect(service.call('extract data', testSchema)).rejects.toThrow(StructuredCallError);
      await expect(service.call('extract data', testSchema)).rejects.toMatchObject({
        code: 'parse_failed',
      });
    });

    it('throws StructuredCallError with parse_failed on incomplete JSON', async () => {
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '{"name":"incomplete","count":',
      });

      await expect(service.call('extract data', testSchema)).rejects.toThrow(StructuredCallError);
      await expect(service.call('extract data', testSchema)).rejects.toMatchObject({
        code: 'parse_failed',
      });
    });

    it('propagates executor errors directly (not wrapped in StructuredCallError)', async () => {
      const executorError = new Error('Agent connection failed');
      vi.mocked(mockExecutor.execute).mockRejectedValue(executorError);

      await expect(service.call('extract data', testSchema)).rejects.toThrow(executorError);
      await expect(service.call('extract data', testSchema)).rejects.not.toBeInstanceOf(
        StructuredCallError
      );
    });
  });

  describe('feature detection', () => {
    it('checks for AgentFeature.structuredOutput on the executor', async () => {
      vi.mocked(mockExecutor.supportsFeature).mockReturnValue(true);
      vi.mocked(mockExecutor.execute).mockResolvedValue({
        result: '',
        metadata: { structured_output: { name: 'x', count: 0 } },
      });

      await service.call('test', testSchema);

      expect(mockExecutor.supportsFeature).toHaveBeenCalledWith(AgentFeature.structuredOutput);
    });
  });
});

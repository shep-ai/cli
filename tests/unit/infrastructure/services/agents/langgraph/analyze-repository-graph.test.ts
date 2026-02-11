/**
 * Analyze Repository Graph Unit Tests
 *
 * Tests for the LangGraph StateGraph that orchestrates repository analysis
 * by delegating to an IAgentExecutor.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemorySaver } from '@langchain/langgraph';
import type {
  IAgentExecutor,
  AgentExecutionResult,
} from '../../../../../../src/application/ports/output/agent-executor.interface.js';
import { AgentType, AgentFeature } from '../../../../../../src/domain/generated/output.js';
import {
  createAnalyzeRepositoryGraph,
  AnalyzeRepositoryState,
} from '../../../../../../src/infrastructure/services/agents/analyze-repo/analyze-repository-graph.js';
import { buildAnalyzePrompt } from '../../../../../../src/infrastructure/services/agents/analyze-repo/prompts/analyze-repository.prompt.js';

describe('analyzeRepositoryGraph', () => {
  let mockExecutor: IAgentExecutor;
  let checkpointer: MemorySaver;

  beforeEach(() => {
    mockExecutor = {
      agentType: AgentType.ClaudeCode,
      execute: vi.fn().mockResolvedValue({
        result: '# Analysis\nTest analysis content',
        sessionId: 'session-123',
      } satisfies AgentExecutionResult),
      executeStream: vi.fn(),
      supportsFeature: vi.fn().mockReturnValue(true),
    };
    checkpointer = new MemorySaver();
  });

  it('should create a compiled graph', () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);
    expect(compiled).toBeDefined();
  });

  it('should execute graph and return analysis markdown', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    const result = await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-1' } }
    );

    expect(result.analysisMarkdown).toBe('# Analysis\nTest analysis content');
  });

  it('should pass repository path in prompt to executor', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-2' } }
    );

    expect(mockExecutor.execute).toHaveBeenCalledOnce();
    const [prompt] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(prompt).toContain('/test/repo');
    expect(prompt).toContain('Repository path:');
  });

  it('should propagate session ID from executor result', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    const result = await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-3' } }
    );

    expect(result.sessionId).toBe('session-123');
  });

  it('should handle executor errors gracefully', async () => {
    const errorExecutor: IAgentExecutor = {
      ...mockExecutor,
      execute: vi.fn().mockRejectedValue(new Error('Agent execution failed')),
    };

    const compiled = createAnalyzeRepositoryGraph(errorExecutor, checkpointer);

    await expect(
      compiled.invoke(
        { repositoryPath: '/test/repo' },
        { configurable: { thread_id: 'test-thread-4' } }
      )
    ).rejects.toThrow('Agent execution failed');
  });

  it('should pass cwd from repositoryPath to executor options', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-cwd' } }
    );

    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options).toEqual(expect.objectContaining({ cwd: '/test/repo' }));
  });

  it('should attempt session resume when sessionId exists and feature is supported', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo', sessionId: 'existing-session' } as Record<string, unknown>,
      { configurable: { thread_id: 'test-thread-5' } }
    );

    expect(mockExecutor.supportsFeature).toHaveBeenCalledWith(AgentFeature.sessionResume);
    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options).toEqual({ cwd: '/test/repo', resumeSession: 'existing-session' });
  });

  it('should not attempt session resume when feature is not supported', async () => {
    (mockExecutor.supportsFeature as ReturnType<typeof vi.fn>).mockReturnValue(false);
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo', sessionId: 'existing-session' } as Record<string, unknown>,
      { configurable: { thread_id: 'test-thread-6' } }
    );

    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options).toEqual({ cwd: '/test/repo' });
  });

  it('should work without a checkpointer', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor);

    const result = await compiled.invoke({ repositoryPath: '/test/repo' });

    expect(result.analysisMarkdown).toBe('# Analysis\nTest analysis content');
  });
});

describe('buildAnalyzePrompt', () => {
  it('should replace repository path placeholder', () => {
    const prompt = buildAnalyzePrompt('/my/project');
    expect(prompt).toContain('/my/project');
    expect(prompt).not.toContain('{{repositoryPath}}');
  });

  it('should include analysis instructions', () => {
    const prompt = buildAnalyzePrompt('/any/path');
    expect(prompt).toContain('Technology stack');
    expect(prompt).toContain('Architecture patterns');
    expect(prompt).toContain('shep-analysis.md');
  });
});

describe('AnalyzeRepositoryState', () => {
  it('should be a valid Annotation root', () => {
    expect(AnalyzeRepositoryState).toBeDefined();
    expect(AnalyzeRepositoryState.spec).toBeDefined();
  });
});

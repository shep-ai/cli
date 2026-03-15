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
} from '@/application/ports/output/agents/agent-executor.interface.js';
import { AgentType } from '@/domain/generated/output.js';
import {
  createAnalyzeRepositoryGraph,
  AnalyzeRepositoryState,
} from '@/infrastructure/services/agents/analyze-repo/analyze-repository-graph.js';
import { buildAnalyzePrompt } from '@/infrastructure/services/agents/analyze-repo/prompts/analyze-repository.prompt.js';
import { initializeSettings, resetSettings } from '@/infrastructure/services/settings.service.js';
import { createDefaultSettings } from '@/domain/factories/settings-defaults.factory.js';

describe('analyzeRepositoryGraph', () => {
  let mockExecutor: IAgentExecutor;
  let checkpointer: MemorySaver;

  beforeEach(() => {
    mockExecutor = {
      agentType: AgentType.ClaudeCode,
      execute: vi.fn().mockResolvedValue({
        result: '# Analysis\nTest analysis content',
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

  it('should not pass resumeSession to executor', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-no-resume' } }
    );

    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.cwd).toBe('/test/repo');
    expect(options.timeout).toBe(600_000);
    expect(options.resumeSession).toBeUndefined();
  });

  it('should work without a checkpointer', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor);

    const result = await compiled.invoke({ repositoryPath: '/test/repo' });

    expect(result.analysisMarkdown).toBe('# Analysis\nTest analysis content');
  });

  it('should use default timeout when settings are not initialized', async () => {
    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-default-timeout' } }
    );

    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.timeout).toBe(600_000);
  });

  it('should use configurable timeout from settings', async () => {
    const settings = createDefaultSettings();
    settings.workflow.analyzeRepoTimeouts = { analyzeMs: 900_000 };
    initializeSettings(settings);

    const compiled = createAnalyzeRepositoryGraph(mockExecutor, checkpointer);

    await compiled.invoke(
      { repositoryPath: '/test/repo' },
      { configurable: { thread_id: 'test-thread-custom-timeout' } }
    );

    const [, options] = (mockExecutor.execute as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.timeout).toBe(900_000);

    resetSettings();
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

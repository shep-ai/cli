import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentExecutorProvider } from '../../../../../src/infrastructure/services/agents/common/agent-executor-provider.service.js';
import type { IAgentExecutorFactory } from '../../../../../src/application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutor } from '../../../../../src/application/ports/output/agents/agent-executor.interface.js';

const { mockGetSettings } = vi.hoisted(() => ({
  mockGetSettings: vi.fn(),
}));

vi.mock('../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: mockGetSettings,
}));

describe('AgentExecutorProvider', () => {
  let provider: AgentExecutorProvider;
  let mockFactory: IAgentExecutorFactory;
  let mockExecutor: IAgentExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecutor = {
      agentType: 'claude-code' as any,
      execute: vi.fn(),
      executeStream: vi.fn(),
      supportsFeature: vi.fn(),
    };
    mockFactory = {
      createExecutor: vi.fn().mockReturnValue(mockExecutor),
      getSupportedAgents: vi.fn(),
    };
    mockGetSettings.mockReturnValue({
      agent: { type: 'claude-code', authMethod: 'session' },
    });
    provider = new AgentExecutorProvider(mockFactory);
  });

  it('should call getSettings and pass agent.type and agent config to factory', () => {
    provider.getExecutor();

    expect(mockGetSettings).toHaveBeenCalledOnce();
    expect(mockFactory.createExecutor).toHaveBeenCalledWith('claude-code', {
      type: 'claude-code',
      authMethod: 'session',
    });
  });

  it('should return the executor from the factory', () => {
    const result = provider.getExecutor();

    expect(result).toBe(mockExecutor);
  });

  it('should use the configured agent type, not a hardcoded default', () => {
    mockGetSettings.mockReturnValue({
      agent: { type: 'cursor', authMethod: 'token', token: 'abc' },
    });

    provider.getExecutor();

    expect(mockFactory.createExecutor).toHaveBeenCalledWith('cursor', {
      type: 'cursor',
      authMethod: 'token',
      token: 'abc',
    });
  });

  it('should throw if settings are not initialized', () => {
    mockGetSettings.mockImplementation(() => {
      throw new Error('Settings not initialized. Call initializeSettings() during CLI bootstrap.');
    });

    expect(() => provider.getExecutor()).toThrow(
      'Settings not initialized. Call initializeSettings() during CLI bootstrap.'
    );
  });
});

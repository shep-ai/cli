/**
 * Agent Runtime Interface Type Contract Tests
 *
 * Validates that the IAgentRunner and IAgentRegistry interfaces
 * compile correctly and their type contracts are sound.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import type {
  IAgentRunner,
  AgentRunOptions,
} from '@/application/ports/output/services/agents/agent-runner.interface.js';
import type {
  IAgentRegistry,
  AgentDefinitionWithFactory,
} from '@/application/ports/output/services/agents/agent-registry.interface.js';

describe('IAgentRunner type contracts', () => {
  it('should define runAgent method signature', () => {
    const mockRunner: IAgentRunner = {
      runAgent: async (_name, prompt, _options?) =>
        ({
          id: 'run-1',
          agentType: 'claude-code',
          status: 'completed',
          prompt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }) as any,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      runAgentStream: async function* () {},
    };
    expect(mockRunner.runAgent).toBeDefined();
  });

  it('should accept all AgentRunOptions fields', () => {
    const options: AgentRunOptions = {
      repositoryPath: '/path/to/repo',
      model: 'claude-sonnet-4-5-20250929',
      resumeSession: 'session-123',
      background: false,
      timeout: 30000,
    };
    expect(options.repositoryPath).toBe('/path/to/repo');
    expect(options.model).toBe('claude-sonnet-4-5-20250929');
    expect(options.resumeSession).toBe('session-123');
    expect(options.background).toBe(false);
    expect(options.timeout).toBe(30000);
  });

  it('should allow empty AgentRunOptions', () => {
    const options: AgentRunOptions = {};
    expect(options.repositoryPath).toBeUndefined();
    expect(options.model).toBeUndefined();
    expect(options.resumeSession).toBeUndefined();
    expect(options.background).toBeUndefined();
    expect(options.timeout).toBeUndefined();
  });

  it('should return an AgentRun from runAgent', async () => {
    const mockRunner: IAgentRunner = {
      runAgent: async (name, prompt) =>
        ({
          id: 'run-abc',
          agentType: 'claude-code',
          status: 'running',
          prompt,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }) as any,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      runAgentStream: async function* () {},
    };
    const run = await mockRunner.runAgent('analyze-repository', 'Analyze this repo');
    expect(run).toBeDefined();
    expect(run.status).toBe('running');
    expect(run.prompt).toBe('Analyze this repo');
  });

  it('should pass options through to runAgent', async () => {
    let capturedOptions: AgentRunOptions | undefined;
    const mockRunner: IAgentRunner = {
      runAgent: async (name, prompt, options?) => {
        capturedOptions = options;
        return {} as any;
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      runAgentStream: async function* () {},
    };
    await mockRunner.runAgent('implement-feature', 'Build login', {
      repositoryPath: '/workspace',
      background: true,
      timeout: 120000,
    });
    expect(capturedOptions?.repositoryPath).toBe('/workspace');
    expect(capturedOptions?.background).toBe(true);
    expect(capturedOptions?.timeout).toBe(120000);
  });
});

describe('IAgentRegistry type contracts', () => {
  it('should define register, get, list methods', () => {
    const mockRegistry: IAgentRegistry = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      register: (_def) => {},
      get: (_name) => undefined,
      list: () => [],
    };
    expect(mockRegistry.register).toBeDefined();
    expect(mockRegistry.get).toBeDefined();
    expect(mockRegistry.list).toBeDefined();
  });

  it('should define AgentDefinitionWithFactory extending AgentDefinition', () => {
    const def: AgentDefinitionWithFactory = {
      name: 'analyze-repository',
      description: 'Analyze repository structure',
      graphFactory: () => ({}),
    };
    expect(def.name).toBe('analyze-repository');
    expect(def.description).toBe('Analyze repository structure');
    expect(def.graphFactory).toBeDefined();
  });

  it('should return undefined for unregistered agent names', () => {
    const mockRegistry: IAgentRegistry = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      register: () => {},
      get: () => undefined,
      list: () => [],
    };
    expect(mockRegistry.get('nonexistent')).toBeUndefined();
  });

  it('should return registered agents from list', () => {
    const defs: AgentDefinitionWithFactory[] = [
      {
        name: 'analyze-repository',
        description: 'Analyze repository',
        graphFactory: () => ({}),
      },
      {
        name: 'gather-requirements',
        description: 'Gather requirements',
        graphFactory: () => ({}),
      },
    ];
    const mockRegistry: IAgentRegistry = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      register: () => {},
      get: (name) => defs.find((d) => d.name === name),
      list: () => defs,
    };
    expect(mockRegistry.list()).toHaveLength(2);
    expect(mockRegistry.list()[0].name).toBe('analyze-repository');
    expect(mockRegistry.list()[1].name).toBe('gather-requirements');
  });

  it('should retrieve a registered agent by name', () => {
    const def: AgentDefinitionWithFactory = {
      name: 'implement-feature',
      description: 'Implement a feature from a plan',
      graphFactory: () => ({ nodes: [] }),
    };
    const mockRegistry: IAgentRegistry = {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      register: () => {},
      get: (name) => (name === 'implement-feature' ? def : undefined),
      list: () => [def],
    };
    const found = mockRegistry.get('implement-feature');
    expect(found).toBeDefined();
    expect(found?.name).toBe('implement-feature');
    expect(found?.graphFactory()).toEqual({ nodes: [] });
  });

  it('should allow graphFactory to accept arguments', () => {
    const def: AgentDefinitionWithFactory = {
      name: 'custom-agent',
      description: 'Custom agent with config',
      graphFactory: (config: unknown) => ({ config }),
    };
    const result = def.graphFactory({ maxRetries: 3 });
    expect(result).toEqual({ config: { maxRetries: 3 } });
  });
});

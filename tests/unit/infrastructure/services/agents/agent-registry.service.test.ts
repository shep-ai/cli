/**
 * AgentRegistryService Unit Tests
 *
 * Tests for the in-memory agent registry that manages agent definitions.
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistryService } from '@/infrastructure/services/agents/common/agent-registry.service.js';
import type { AgentDefinitionWithFactory } from '@/application/ports/output/agents/agent-registry.interface.js';

describe('AgentRegistryService', () => {
  let registry: AgentRegistryService;

  beforeEach(() => {
    registry = new AgentRegistryService();
  });

  describe('constructor', () => {
    it('should pre-register the analyze-repository agent', () => {
      const agent = registry.get('analyze-repository');

      expect(agent).toBeDefined();
      expect(agent!.name).toBe('analyze-repository');
      expect(agent!.description).toBe(
        'Analyze repository structure, dependencies, and architecture'
      );
      expect(typeof agent!.graphFactory).toBe('function');
    });
  });

  describe('register', () => {
    it('should register a new agent definition', () => {
      const definition: AgentDefinitionWithFactory = {
        name: 'gather-requirements',
        description: 'Gather and refine user requirements',
        graphFactory: () => ({}),
      };

      registry.register(definition);

      const result = registry.get('gather-requirements');
      expect(result).toBe(definition);
    });

    it('should overwrite an existing agent with the same name', () => {
      const original: AgentDefinitionWithFactory = {
        name: 'test-agent',
        description: 'Original',
        graphFactory: () => ({}),
      };
      const updated: AgentDefinitionWithFactory = {
        name: 'test-agent',
        description: 'Updated',
        graphFactory: () => ({}),
      };

      registry.register(original);
      registry.register(updated);

      const result = registry.get('test-agent');
      expect(result).toBe(updated);
      expect(result!.description).toBe('Updated');
    });
  });

  describe('get', () => {
    it('should return a registered agent by name', () => {
      const agent = registry.get('analyze-repository');

      expect(agent).toBeDefined();
      expect(agent!.name).toBe('analyze-repository');
    });

    it('should return undefined for an unknown agent name', () => {
      const agent = registry.get('non-existent-agent');

      expect(agent).toBeUndefined();
    });
  });

  describe('list', () => {
    it('should list all registered agents', () => {
      const agents = registry.list();

      expect(agents).toHaveLength(2);
      const names = agents.map((a) => a.name);
      expect(names).toContain('analyze-repository');
      expect(names).toContain('feature-agent');
    });

    it('should include newly registered agents in the list', () => {
      registry.register({
        name: 'plan-feature',
        description: 'Plan a feature',
        graphFactory: () => ({}),
      });

      const agents = registry.list();

      expect(agents).toHaveLength(3);
      const names = agents.map((a) => a.name);
      expect(names).toContain('analyze-repository');
      expect(names).toContain('feature-agent');
      expect(names).toContain('plan-feature');
    });

    it('should return a new array (not the internal collection)', () => {
      const list1 = registry.list();
      const list2 = registry.list();

      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });
});

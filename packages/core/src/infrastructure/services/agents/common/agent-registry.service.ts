/**
 * Agent Registry Service
 *
 * Infrastructure implementation of the IAgentRegistry port.
 * Manages agent workflow definitions in an in-memory map,
 * enabling runtime discovery and instantiation of agent workflows.
 *
 * Pre-registers built-in agents (analyze-repository) at construction time.
 */

import type {
  IAgentRegistry,
  AgentDefinitionWithFactory,
} from '../../../../application/ports/output/agents/agent-registry.interface.js';
import { createAnalyzeRepositoryGraph } from '../analyze-repo/analyze-repository-graph.js';
import { createFeatureAgentGraph } from '../feature-agent/feature-agent-graph.js';

export class AgentRegistryService implements IAgentRegistry {
  private readonly agents = new Map<string, AgentDefinitionWithFactory>();

  constructor() {
    // Register built-in agents
    this.register({
      name: 'analyze-repository',
      description: 'Analyze repository structure, dependencies, and architecture',
      graphFactory: createAnalyzeRepositoryGraph,
    });

    this.register({
      name: 'feature-agent',
      description: 'Autonomous SDLC agent: analyze → requirements → research → plan → implement',
      graphFactory: createFeatureAgentGraph,
    });
  }

  register(definition: AgentDefinitionWithFactory): void {
    this.agents.set(definition.name, definition);
  }

  get(name: string): AgentDefinitionWithFactory | undefined {
    return this.agents.get(name);
  }

  list(): AgentDefinitionWithFactory[] {
    return Array.from(this.agents.values());
  }
}

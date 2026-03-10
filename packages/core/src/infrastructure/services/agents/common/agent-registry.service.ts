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
} from '@/application/ports/output/agents/agent-registry.interface.js';

/**
 * Lazy agent definition. The graphFactory is loaded on first access via
 * dynamic import, avoiding the ~300ms @langchain/langgraph import at startup.
 */
interface LazyAgentDefinition {
  name: string;
  description: string;
  importFn: () => Promise<Record<string, unknown>>;
  factoryExport: string;
  /** Cached placeholder definition for list() — avoids creating new objects each call */
  placeholder?: AgentDefinitionWithFactory;
}

export class AgentRegistryService implements IAgentRegistry {
  private readonly agents = new Map<string, AgentDefinitionWithFactory>();
  private readonly lazyAgents: LazyAgentDefinition[] = [];

  constructor() {
    // Register built-in agents as lazy definitions to avoid importing
    // @langchain/langgraph (~300ms) at CLI startup.
    this.lazyAgents.push(
      {
        name: 'analyze-repository',
        description: 'Analyze repository structure, dependencies, and architecture',
        importFn: () => import('../analyze-repo/analyze-repository-graph.js'),
        factoryExport: 'createAnalyzeRepositoryGraph',
      },
      {
        name: 'feature-agent',
        description: 'Autonomous SDLC agent: analyze → requirements → research → plan → implement',
        importFn: () => import('../feature-agent/feature-agent-graph.js'),
        factoryExport: 'createFeatureAgentGraph',
      }
    );
  }

  private async resolveLazy(name: string): Promise<AgentDefinitionWithFactory | undefined> {
    const lazy = this.lazyAgents.find((a) => a.name === name);
    if (!lazy) return undefined;
    const mod = await lazy.importFn();
    const definition: AgentDefinitionWithFactory = {
      name: lazy.name,
      description: lazy.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graphFactory: mod[lazy.factoryExport] as (...args: any[]) => any,
    };
    this.agents.set(name, definition);
    return definition;
  }

  register(definition: AgentDefinitionWithFactory): void {
    this.agents.set(definition.name, definition);
  }

  async get(name: string): Promise<AgentDefinitionWithFactory | undefined> {
    const eager = this.agents.get(name);
    if (eager) return eager;
    return this.resolveLazy(name);
  }

  list(): AgentDefinitionWithFactory[] {
    // Returns eagerly-registered + cached placeholder metadata for lazy agents.
    const all = new Map(this.agents);
    for (const lazy of this.lazyAgents) {
      if (!all.has(lazy.name)) {
        lazy.placeholder ??= {
          name: lazy.name,
          description: lazy.description,
          graphFactory: () => {
            throw new Error(`Agent '${lazy.name}' must be resolved via get() before use`);
          },
        };
        all.set(lazy.name, lazy.placeholder);
      }
    }
    return Array.from(all.values());
  }
}

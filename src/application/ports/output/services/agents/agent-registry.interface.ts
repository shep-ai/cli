/**
 * Agent Registry Interface
 *
 * Output port for managing agent workflow definitions. The registry holds
 * all registered agent definitions including their LangGraph graph factories,
 * enabling runtime discovery and instantiation of agent workflows.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 *
 * @example
 * ```typescript
 * const registry: IAgentRegistry = container.resolve('IAgentRegistry');
 *
 * // Register an agent definition with its graph factory
 * registry.register({
 *   name: 'analyze-repository',
 *   description: 'Analyze repository structure and technologies',
 *   graphFactory: () => createAnalyzeGraph(),
 * });
 *
 * // Look up a registered agent
 * const agent = registry.get('analyze-repository');
 * if (agent) {
 *   const graph = agent.graphFactory();
 * }
 *
 * // List all registered agents
 * const agents = registry.list();
 * ```
 */

import type { AgentDefinition } from '@/domain/generated/output.js';

/**
 * Extended agent definition that includes a graph factory function.
 *
 * Extends the TypeSpec-generated AgentDefinition with a runtime-only
 * `graphFactory` property that creates LangGraph StateGraph instances.
 * This property is TypeScript-only and not represented in TypeSpec
 * since it's a runtime concern.
 */
export interface AgentDefinitionWithFactory extends AgentDefinition {
  /** Factory function that creates the LangGraph StateGraph for this agent */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  graphFactory: (...args: any[]) => any;
}

/**
 * Port interface for managing agent workflow registrations.
 *
 * Implementations must:
 * - Store agent definitions keyed by name
 * - Prevent duplicate registrations (or overwrite silently)
 * - Return undefined for unknown agent names
 *
 * @example
 * ```typescript
 * const registry: IAgentRegistry = container.resolve('IAgentRegistry');
 *
 * // Register agents at application startup
 * registry.register({
 *   name: 'gather-requirements',
 *   description: 'Gather and refine user requirements',
 *   graphFactory: createRequirementsGraph,
 * });
 *
 * // Query available agents
 * const all = registry.list();
 * console.log(`${all.length} agents registered`);
 * ```
 */
export interface IAgentRegistry {
  /**
   * Register an agent definition with the registry.
   *
   * @param definition - The agent definition including its graph factory
   */
  register(definition: AgentDefinitionWithFactory): void;

  /**
   * Retrieve a registered agent definition by name.
   *
   * @param name - The unique agent name (e.g., 'analyze-repository')
   * @returns The agent definition, or undefined if not registered
   */
  get(name: string): AgentDefinitionWithFactory | undefined;

  /**
   * List all registered agent definitions.
   *
   * @returns Array of all registered agent definitions
   */
  list(): AgentDefinitionWithFactory[];
}

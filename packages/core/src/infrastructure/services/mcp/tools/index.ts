/**
 * MCP Tools Registration
 *
 * Barrel module that registers all MCP tools on a server instance.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type DependencyContainer from 'tsyringe/dist/typings/types/dependency-container.js';
import { registerFeatureTools } from './feature-tools.js';

/**
 * Register all MCP tools on the server.
 */
export function registerAllTools(server: McpServer, container: DependencyContainer): void {
  registerFeatureTools(server, container);
}

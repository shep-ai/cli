/**
 * MCP Feature Tools
 *
 * Registers feature-related MCP tools on the server.
 * Each tool is a thin adapter that delegates to a use case.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type DependencyContainer from 'tsyringe/dist/typings/types/dependency-container.js';
import { z } from 'zod';
import { ListFeaturesUseCase } from '../../../../application/use-cases/features/list-features.use-case.js';
import { SdlcLifecycle } from '../../../../domain/generated/output.js';
import type { FeatureListFilters } from '../../../../application/ports/output/repositories/feature-repository.interface.js';

/**
 * Wraps an async handler in try/catch, returning MCP error responses on failure.
 */
async function withErrorHandling(
  fn: () => Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }>
): Promise<{ content: { type: 'text'; text: string }[]; isError?: boolean }> {
  try {
    return await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: message }],
      isError: true,
    };
  }
}

/**
 * Register feature-related MCP tools on the server.
 */
export function registerFeatureTools(server: McpServer, container: DependencyContainer): void {
  server.registerTool(
    'list_features',
    {
      description:
        'List all features tracked by shep. Optionally filter by lifecycle status (e.g. Pending, Implementation, Review).',
      inputSchema: {
        status: z
          .enum([
            SdlcLifecycle.Started,
            SdlcLifecycle.Analyze,
            SdlcLifecycle.Requirements,
            SdlcLifecycle.Research,
            SdlcLifecycle.Planning,
            SdlcLifecycle.Implementation,
            SdlcLifecycle.Review,
            SdlcLifecycle.Maintain,
            SdlcLifecycle.Blocked,
            SdlcLifecycle.Pending,
          ])
          .optional()
          .describe('Filter by lifecycle status'),
      },
    },
    async ({ status }) => {
      return withErrorHandling(async () => {
        const useCase = container.resolve(ListFeaturesUseCase);
        const filters: FeatureListFilters = {};
        if (status) {
          filters.lifecycle = status as SdlcLifecycle;
        }
        const features = await useCase.execute(filters);
        return {
          content: [{ type: 'text' as const, text: JSON.stringify(features, null, 2) }],
        };
      });
    }
  );
}

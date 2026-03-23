/**
 * Feature Tools Unit Tests
 *
 * Tests for the list_features MCP tool registration and handler.
 * Uses InMemoryTransport + MCP Client for protocol-accurate testing.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { registerFeatureTools } from '@/infrastructure/services/mcp/tools/feature-tools.js';
import type { Feature } from '@/domain/generated/output.js';
import { SdlcLifecycle } from '@/domain/generated/output.js';

const mockListFeaturesUseCase = {
  execute: vi.fn(),
};

const mockContainer = {
  resolve: vi.fn().mockImplementation((token: unknown) => {
    const tokenName = typeof token === 'function' ? (token as { name: string }).name : token;
    if (tokenName === 'ListFeaturesUseCase') {
      return mockListFeaturesUseCase;
    }
    throw new Error(`Unknown token: ${String(token)}`);
  }),
};

describe('Feature Tools', () => {
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    vi.clearAllMocks();
    server = new McpServer({ name: 'test', version: '0.0.0' });
    registerFeatureTools(server, mockContainer as never);

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: 'test-client', version: '0.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });

  afterEach(async () => {
    await client.close();
    await server.close();
  });

  describe('registerFeatureTools', () => {
    it('registers list_features tool', async () => {
      const { tools } = await client.listTools();
      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('list_features');
    });

    it('list_features tool has a description', async () => {
      const { tools } = await client.listTools();
      const tool = tools.find((t) => t.name === 'list_features');
      expect(tool?.description).toBeDefined();
      expect(tool!.description!.length).toBeGreaterThan(0);
    });
  });

  describe('list_features handler', () => {
    it('calls ListFeaturesUseCase.execute() with empty filters when no params provided', async () => {
      mockListFeaturesUseCase.execute.mockResolvedValue([]);

      await client.callTool({ name: 'list_features', arguments: {} });

      expect(mockListFeaturesUseCase.execute).toHaveBeenCalledWith({});
    });

    it('passes lifecycle filter when status is provided', async () => {
      mockListFeaturesUseCase.execute.mockResolvedValue([]);

      await client.callTool({
        name: 'list_features',
        arguments: { status: 'Implementation' },
      });

      expect(mockListFeaturesUseCase.execute).toHaveBeenCalledWith({
        lifecycle: SdlcLifecycle.Implementation,
      });
    });

    it('returns successful result as JSON text content', async () => {
      const mockFeatures: Partial<Feature>[] = [
        { id: 'feat-1', name: 'Feature One' },
        { id: 'feat-2', name: 'Feature Two' },
      ];
      mockListFeaturesUseCase.execute.mockResolvedValue(mockFeatures);

      const result = await client.callTool({ name: 'list_features', arguments: {} });

      expect(result.content).toBeDefined();
      const textContent = result.content as { type: string; text: string }[];
      expect(textContent[0].type).toBe('text');
      const parsed = JSON.parse(textContent[0].text);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].id).toBe('feat-1');
    });

    it('returns use case error as MCP error response with isError: true', async () => {
      mockListFeaturesUseCase.execute.mockRejectedValue(new Error('Database connection failed'));

      const result = await client.callTool({ name: 'list_features', arguments: {} });

      expect(result.isError).toBe(true);
      const textContent = result.content as { type: string; text: string }[];
      expect(textContent[0].type).toBe('text');
      expect(textContent[0].text).toContain('Database connection failed');
    });
  });
});

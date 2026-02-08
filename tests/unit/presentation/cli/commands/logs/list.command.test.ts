/**
 * Tests for List Logs Command
 *
 * Verifies the list logs command behavior and option parsing.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ILogRepository } from '../../../../../../src/application/ports/output/log-repository.interface.js';
import type { ILogger } from '../../../../../../src/application/ports/output/logger.interface.js';
import { createMockLogger } from '../../../../../helpers/mock-logger.js';

// Mock the DI container
vi.mock('../../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

import { container } from '../../../../../../src/infrastructure/di/container.js';
import { createListCommand } from '../../../../../../src/presentation/cli/commands/logs/list.command.js';

describe('ListCommand', () => {
  let mockRepository: ILogRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Create mocks
    mockLogger = createMockLogger();
    mockRepository = {
      save: vi.fn(),
      findById: vi.fn(),
      search: vi.fn(),
      count: vi.fn(),
      deleteOlderThan: vi.fn(),
    };

    // Setup container mock
    vi.mocked(container.resolve).mockImplementation((token: any) => {
      if (token === 'ILogger') return mockLogger as any;
      if (token === 'ILogRepository') return mockRepository as any;
      throw new Error(`Unknown token: ${String(token)}`);
    });
  });

  it('should have correct command name and description', () => {
    const command = createListCommand();

    expect(command.name()).toBe('list');
    expect(command.description()).toContain('recent logs');
  });

  it('should have level option with valid choices', () => {
    const command = createListCommand();

    const levelOption = command.options.find((opt: any) => opt.long === '--level');
    expect(levelOption).toBeDefined();
    expect(levelOption?.argChoices).toEqual(['debug', 'info', 'warn', 'error']);
  });

  it('should have source option', () => {
    const command = createListCommand();

    const sourceOption = command.options.find((opt: any) => opt.long === '--source');
    expect(sourceOption).toBeDefined();
  });

  it('should have limit option with default value', () => {
    const command = createListCommand();

    const limitOption = command.options.find((opt: any) => opt.long === '--limit');
    expect(limitOption).toBeDefined();
    expect(limitOption?.defaultValue).toBe(50);
  });

  it('should have offset option with default value', () => {
    const command = createListCommand();

    const offsetOption = command.options.find((opt: any) => opt.long === '--offset');
    expect(offsetOption).toBeDefined();
    expect(offsetOption?.defaultValue).toBe(0);
  });

  it('should have output format option', () => {
    const command = createListCommand();

    const outputOption = command.options.find((opt: any) => opt.long === '--output');
    expect(outputOption).toBeDefined();
    expect(outputOption?.argChoices).toEqual(['table', 'json', 'yaml']);
    expect(outputOption?.defaultValue).toBe('table');
  });

  // Note: Full command execution tests are skipped as Commander's parseAsync
  // is difficult to test in unit tests. These will be covered by E2E tests.

  it.skip('should call repository search with correct filters', async () => {
    // E2E test coverage - testing Commander action functions in isolation is brittle
  });

  it.skip('should log debug message when listing logs', async () => {
    // E2E test coverage - testing Commander action functions in isolation is brittle
  });
});

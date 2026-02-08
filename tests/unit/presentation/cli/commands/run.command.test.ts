/**
 * Run Command Unit Tests
 *
 * Tests for the `shep run` command structure.
 *
 * TDD Phase: GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Command } from 'commander';

// Mock the DI container (prevents runtime resolution errors)
vi.mock('../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

// Mock the use case module (prevents import errors since it doesn't exist yet)
vi.mock('../../../../../src/application/use-cases/agents/run-agent.use-case.js', () => ({
  RunAgentUseCase: class MockRunAgentUseCase {},
}));

import { createRunCommand } from '../../../../../src/presentation/cli/commands/run.command.js';

describe('Run Command', () => {
  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createRunCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('should have the name "run"', () => {
      const cmd = createRunCommand();
      expect(cmd.name()).toBe('run');
    });

    it('should have a description mentioning agent', () => {
      const cmd = createRunCommand();
      expect(cmd.description()).toContain('agent');
    });

    it('should accept agent-name as a required argument', () => {
      const cmd = createRunCommand();
      const args = (cmd as any)._args;
      expect(args).toHaveLength(1);
      expect(args[0].name()).toBe('agent-name');
      expect(args[0].required).toBe(true);
    });

    it('should have --prompt option with default value', () => {
      const cmd = createRunCommand();
      const promptOpt = cmd.options.find((o) => o.long === '--prompt');
      expect(promptOpt).toBeDefined();
      expect(promptOpt!.defaultValue).toBeDefined();
    });

    it('should have --repo option', () => {
      const cmd = createRunCommand();
      const repoOpt = cmd.options.find((o) => o.long === '--repo');
      expect(repoOpt).toBeDefined();
    });

    it('should have -p as short flag for --prompt', () => {
      const cmd = createRunCommand();
      const promptOpt = cmd.options.find((o) => o.long === '--prompt');
      expect(promptOpt!.short).toBe('-p');
    });

    it('should have -r as short flag for --repo', () => {
      const cmd = createRunCommand();
      const repoOpt = cmd.options.find((o) => o.long === '--repo');
      expect(repoOpt!.short).toBe('-r');
    });

    it('should have --stream option', () => {
      const cmd = createRunCommand();
      const streamOpt = cmd.options.find((o) => o.long === '--stream');
      expect(streamOpt).toBeDefined();
    });

    it('should have -s as short flag for --stream', () => {
      const cmd = createRunCommand();
      const streamOpt = cmd.options.find((o) => o.long === '--stream');
      expect(streamOpt!.short).toBe('-s');
    });
  });
});

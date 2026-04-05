/**
 * Security Command Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';

// Mock DI container
vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

// Mock i18n to return key as translation
vi.mock('../../../../../src/presentation/cli/i18n.js', () => ({
  getCliI18n: () => ({
    t: (key: string) => key,
  }),
}));

// Mock UI
vi.mock('../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    newline: vi.fn(),
    log: vi.fn(),
  },
  colors: {
    error: (s: string) => s,
    warning: (s: string) => s,
    muted: (s: string) => s,
    brand: (s: string) => s,
    success: (s: string) => s,
  },
  fmt: {
    label: (s: string) => s,
    heading: (s: string) => s,
  },
}));

import { createSecurityCommand } from '../../../../../src/presentation/cli/commands/security.command.js';

describe('createSecurityCommand', () => {
  it('should create a Commander command named security', () => {
    const cmd = createSecurityCommand();
    expect(cmd.name()).toBe('security');
  });

  it('should have an enforce subcommand', () => {
    const cmd = createSecurityCommand();
    const enforceCmd = cmd.commands.find((c) => c.name() === 'enforce');
    expect(enforceCmd).toBeDefined();
  });

  it('should have --repo and --output options on enforce', () => {
    const cmd = createSecurityCommand();
    const enforceCmd = cmd.commands.find((c) => c.name() === 'enforce');
    expect(enforceCmd).toBeDefined();

    const options = enforceCmd!.options;
    const repoOpt = options.find((o) => o.long === '--repo');
    const outputOpt = options.find((o) => o.long === '--output');
    expect(repoOpt).toBeDefined();
    expect(outputOpt).toBeDefined();
  });

  it('should default --output to table', () => {
    const cmd = createSecurityCommand();
    const enforceCmd = cmd.commands.find((c) => c.name() === 'enforce');
    const outputOpt = enforceCmd!.options.find((o) => o.long === '--output');
    expect(outputOpt!.defaultValue).toBe('table');
  });

  it('should default --repo to cwd', () => {
    const cmd = createSecurityCommand();
    const enforceCmd = cmd.commands.find((c) => c.name() === 'enforce');
    const repoOpt = enforceCmd!.options.find((o) => o.long === '--repo');
    expect(repoOpt!.defaultValue).toBe(process.cwd());
  });
});

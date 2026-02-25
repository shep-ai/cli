/**
 * Joke Command Unit Tests
 *
 * TDD Phase: RED-GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockResolve, mockExecute } = vi.hoisted(() => ({
  mockResolve: vi.fn(),
  mockExecute: vi
    .fn()
    .mockReturnValue('Why do programmers prefer dark mode? Because light attracts bugs!'),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: { resolve: (...args: unknown[]) => mockResolve(...args) },
}));

vi.mock('../../../../../src/presentation/cli/ui/index.js', () => ({
  fmt: {
    italic: (s: string) => s,
  },
}));

import { createJokeCommand } from '../../../../../src/presentation/cli/commands/joke.command.js';

describe('createJokeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    mockResolve.mockImplementation((token: unknown) => {
      const key = typeof token === 'function' ? token.name : String(token);
      if (key === 'GetJokeUseCase') return { execute: mockExecute };
      return {};
    });
  });

  it('should create a command named "joke"', () => {
    const cmd = createJokeCommand();
    expect(cmd.name()).toBe('joke');
  });

  it('should have a non-empty description', () => {
    const cmd = createJokeCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('should resolve GetJokeUseCase from the DI container when invoked', async () => {
    const cmd = createJokeCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockResolve).toHaveBeenCalled();
  });

  it('should call execute() on the resolved use case', async () => {
    const cmd = createJokeCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(mockExecute).toHaveBeenCalledOnce();
  });

  it('should print the joke wrapped in fmt.italic to stdout', async () => {
    const jokeText = 'Why do programmers prefer dark mode? Because light attracts bugs!';
    mockExecute.mockReturnValue(jokeText);

    const cmd = createJokeCommand();
    await cmd.parseAsync([], { from: 'user' });

    expect(console.log).toHaveBeenCalledWith(jokeText);
  });
});

/**
 * Joke Command
 *
 * Displays a random developer/programming joke.
 *
 * Usage: shep joke
 *
 * @example
 * $ shep joke
 * Why do programmers prefer dark mode? Because light attracts bugs!
 */

import { Command } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { GetJokeUseCase } from '@/application/use-cases/get-joke.use-case.js';
import { fmt } from '../ui/index.js';

/**
 * Create the joke command
 */
export function createJokeCommand(): Command {
  return new Command('joke').description('Display a random developer joke').action(() => {
    const useCase = container.resolve(GetJokeUseCase);
    console.log(fmt.italic(useCase.execute()));
  });
}

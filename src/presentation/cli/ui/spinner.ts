/**
 * CLI Design System - Spinner
 *
 * Lightweight terminal spinner for async operations.
 * Uses the braille spinner frames from the symbols module.
 *
 * @example
 * import { spinner } from './spinner';
 * const result = await spinner('Thinking', async () => {
 *   return await someAsyncWork();
 * });
 */

import { symbols } from './symbols.js';
import { colors } from './colors.js';

/**
 * Show a spinner while an async operation runs, then clear it.
 *
 * @param label - Text shown next to the spinner (e.g. "Thinking")
 * @param fn - Async function to execute
 * @returns The result of the async function
 */
export async function spinner<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const frames = symbols.spinner;
  let i = 0;

  // Write initial frame
  const write = () => {
    const frame = frames[i % frames.length];
    process.stderr.write(`\r${colors.muted(`${frame} ${label}...`)}`);
    i++;
  };

  write();
  const interval = setInterval(write, 80);

  try {
    const result = await fn();
    clearInterval(interval);
    // Clear the spinner line
    process.stderr.write(`\r${' '.repeat(label.length + 6)}\r`);
    return result;
  } catch (error) {
    clearInterval(interval);
    process.stderr.write(`\r${' '.repeat(label.length + 6)}\r`);
    throw error;
  }
}

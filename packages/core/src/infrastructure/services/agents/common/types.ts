/**
 * Shared Types for Agent Infrastructure
 *
 * Common type definitions used across agent executor implementations
 * and the agent validator service.
 */

import type { ChildProcess } from 'node:child_process';

/**
 * Type for the spawn dependency.
 * Matches the signature of child_process.spawn.
 * Injected via constructor to enable testability.
 */
export type SpawnFunction = (command: string, args: string[], options?: object) => ChildProcess;

/**
 * Type for the command executor dependency.
 * Matches the promisified signature of child_process.execFile.
 * Injected via constructor to avoid direct node module mocking in tests.
 */
export type ExecFunction = (
  file: string,
  args: string[]
) => Promise<{ stdout: string; stderr: string }>;

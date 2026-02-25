/**
 * Experimental Feature Flag Metadata Registry
 *
 * Single source of truth for all experimental flag metadata (name, description).
 * Consumed by CLI list, CLI enable/disable validation, web panel labels,
 * and settings show table.
 *
 * To add a new flag:
 * 1. Add a boolean field to ExperimentalFeatures in tsp/domain/entities/settings.tsp
 * 2. Add an entry here with matching key
 * 3. Add migration column (exp_ prefix), mapper line, factory default, repository column
 */

export const EXPERIMENTAL_FLAGS = {
  skills: {
    name: 'Skills Page',
    description: 'Enable the experimental skills management page',
  },
} as const satisfies Record<string, { name: string; description: string }>;

export type ExperimentalFlagKey = keyof typeof EXPERIMENTAL_FLAGS;

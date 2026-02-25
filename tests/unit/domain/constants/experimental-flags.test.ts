import { describe, it, expect } from 'vitest';
import {
  EXPERIMENTAL_FLAGS,
  type ExperimentalFlagKey,
} from '@/domain/constants/experimental-flags.js';

describe('EXPERIMENTAL_FLAGS', () => {
  it('should have a skills entry with name and description strings', () => {
    expect(EXPERIMENTAL_FLAGS.skills).toBeDefined();
    expect(typeof EXPERIMENTAL_FLAGS.skills.name).toBe('string');
    expect(typeof EXPERIMENTAL_FLAGS.skills.description).toBe('string');
    expect(EXPERIMENTAL_FLAGS.skills.name.length).toBeGreaterThan(0);
    expect(EXPERIMENTAL_FLAGS.skills.description.length).toBeGreaterThan(0);
  });

  it('should include "skills" as an ExperimentalFlagKey', () => {
    const keys: ExperimentalFlagKey[] = Object.keys(EXPERIMENTAL_FLAGS) as ExperimentalFlagKey[];
    expect(keys).toContain('skills');
  });
});

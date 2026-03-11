import { describe, it, expect } from 'vitest';
import { compareVersions } from '@/lib/compare-versions';

describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns 1 when a is greater (major)', () => {
    expect(compareVersions('2.0.0', '1.0.0')).toBe(1);
  });

  it('returns -1 when a is less (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  });

  it('compares minor versions', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.2.0')).toBe(-1);
  });

  it('compares patch versions', () => {
    expect(compareVersions('1.0.2', '1.0.1')).toBe(1);
    expect(compareVersions('1.0.1', '1.0.2')).toBe(-1);
  });

  it('ignores pre-release suffix', () => {
    expect(compareVersions('1.0.0-dev', '1.0.0')).toBe(0);
    expect(compareVersions('2.0.0-beta.1', '1.99.0')).toBe(1);
  });

  it('handles missing patch segment', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
  });
});

import { describe, it, expect } from 'vitest';

import { composeUserInput } from '@/app/actions/compose-user-input';

describe('composeUserInput()', () => {
  it('returns description unchanged when attachments are empty', () => {
    expect(composeUserInput('my feature description', [])).toBe('my feature description');
  });

  it('returns description unchanged when attachments are undefined', () => {
    expect(composeUserInput('my feature description', undefined)).toBe('my feature description');
  });

  it('appends single @path reference after blank line', () => {
    const result = composeUserInput('desc', [{ path: 'a.png', name: 'a.png' }]);
    expect(result).toBe('desc\n\n@a.png');
  });

  it('appends multiple @path references space-separated', () => {
    const result = composeUserInput('desc', [
      { path: 'a.png', name: 'a.png' },
      { path: 'b.pdf', name: 'b.pdf' },
    ]);
    expect(result).toBe('desc\n\n@a.png @b.pdf');
  });
});

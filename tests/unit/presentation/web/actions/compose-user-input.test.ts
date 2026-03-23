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

  it('appends [Note: ...] after path when notes are present', () => {
    const result = composeUserInput('desc', [
      { path: 'a.png', name: 'a.png', notes: 'main dashboard screenshot' },
    ]);
    expect(result).toBe('desc\n\n@a.png [Note: main dashboard screenshot]');
  });

  it('omits [Note: ...] when notes are empty or whitespace-only', () => {
    const result = composeUserInput('desc', [
      { path: 'a.png', name: 'a.png', notes: '   ' },
      { path: 'b.png', name: 'b.png', notes: '' },
      { path: 'c.png', name: 'c.png' },
    ]);
    expect(result).toBe('desc\n\n@a.png @b.png @c.png');
  });

  it('mixes annotated and plain attachments', () => {
    const result = composeUserInput('feature request', [
      { path: '/tmp/ui.png', name: 'ui.png', notes: 'shows the new layout' },
      { path: '/tmp/spec.pdf', name: 'spec.pdf' },
    ]);
    expect(result).toBe(
      'feature request\n\n@/tmp/ui.png [Note: shows the new layout] @/tmp/spec.pdf'
    );
  });
});

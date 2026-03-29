import { describe, it, expect } from 'vitest';
import { PR_BRANDING, applyPrBranding } from '@/infrastructure/services/git/pr-branding.js';

describe('PR_BRANDING', () => {
  it('should contain the Shep branding text', () => {
    expect(PR_BRANDING).toContain('Shep');
    expect(PR_BRANDING).toContain('https://github.com/shep-ai/cli');
  });
});

describe('applyPrBranding', () => {
  it('should append Shep branding to a plain body', () => {
    const result = applyPrBranding('## Summary\n\nSome changes');
    expect(result).toContain('## Summary');
    expect(result).toContain('Some changes');
    expect(result.endsWith(PR_BRANDING)).toBe(true);
  });

  it('should strip Claude Code branding and add Shep branding', () => {
    const body =
      '## Summary\n\nSome changes\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)';
    const result = applyPrBranding(body);
    expect(result).not.toContain('Claude Code');
    expect(result).not.toContain('claude.com');
    expect(result).toContain(PR_BRANDING);
  });

  it('should strip Claude Code branding without emoji prefix', () => {
    const body =
      '## Summary\n\nSome changes\n\nGenerated with [Claude Code](https://claude.com/claude-code)';
    const result = applyPrBranding(body);
    expect(result).not.toContain('Claude Code');
    expect(result).toContain(PR_BRANDING);
  });

  it('should not duplicate branding if already present', () => {
    const body = `## Summary\n\nSome changes\n\n${PR_BRANDING}`;
    const result = applyPrBranding(body);
    const count = result.split(PR_BRANDING).length - 1;
    expect(count).toBe(1);
  });

  it('should handle empty body', () => {
    const result = applyPrBranding('');
    expect(result).toContain(PR_BRANDING);
  });

  it('should replace Claude Code branding when mixed with other content', () => {
    const body = [
      '## Summary',
      '',
      'Added a feature',
      '',
      '## Test Plan',
      '',
      '- [x] Unit tests pass',
      '',
      '🤖 Generated with [Claude Code](https://claude.com/claude-code)',
    ].join('\n');

    const result = applyPrBranding(body);
    expect(result).not.toContain('Claude Code');
    expect(result).toContain('## Test Plan');
    expect(result.endsWith(PR_BRANDING)).toBe(true);
  });

  it('should trim trailing whitespace before appending branding', () => {
    const result = applyPrBranding('Some content   \n\n\n');
    expect(result).toBe(`Some content\n\n${PR_BRANDING}`);
  });
});

import { describe, it, expect } from 'vitest';
import { deriveName, deriveSlug } from '@/application/use-cases/features/branch-name-utils.js';

describe('branch-name-utils', () => {
  describe('deriveName', () => {
    it('should strip feat/ prefix and title-case', () => {
      expect(deriveName('feat/user-auth')).toBe('User Auth');
    });

    it('should strip fix/ prefix and title-case', () => {
      expect(deriveName('fix/login-bug')).toBe('Login Bug');
    });

    it('should strip chore/ prefix and title-case', () => {
      expect(deriveName('chore/update-deps')).toBe('Update Deps');
    });

    it('should strip refactor/ prefix and title-case', () => {
      expect(deriveName('refactor/auth-module')).toBe('Auth Module');
    });

    it('should strip docs/ prefix and title-case', () => {
      expect(deriveName('docs/api-guide')).toBe('Api Guide');
    });

    it('should strip test/ prefix and title-case', () => {
      expect(deriveName('test/login-flow')).toBe('Login Flow');
    });

    it('should strip ci/ prefix and title-case', () => {
      expect(deriveName('ci/fix-pipeline')).toBe('Fix Pipeline');
    });

    it('should strip build/ prefix and title-case', () => {
      expect(deriveName('build/optimize-bundle')).toBe('Optimize Bundle');
    });

    it('should strip perf/ prefix and title-case', () => {
      expect(deriveName('perf/reduce-renders')).toBe('Reduce Renders');
    });

    it('should strip style/ prefix and title-case', () => {
      expect(deriveName('style/dark-mode')).toBe('Dark Mode');
    });

    it('should strip revert/ prefix and title-case', () => {
      expect(deriveName('revert/bad-merge')).toBe('Bad Merge');
    });

    it('should strip hotfix/ prefix and title-case', () => {
      expect(deriveName('hotfix/critical-crash')).toBe('Critical Crash');
    });

    it('should strip release/ prefix and title-case', () => {
      expect(deriveName('release/v1.0.0')).toBe('V1.0.0');
    });

    it('should handle branch names without a known prefix', () => {
      expect(deriveName('my-cool-feature')).toBe('My Cool Feature');
    });

    it('should handle nested slashes after prefix strip', () => {
      expect(deriveName('feat/auth/login-bug')).toBe('Auth Login Bug');
    });

    it('should handle underscores by replacing with spaces', () => {
      expect(deriveName('my_cool_feature')).toBe('My Cool Feature');
    });

    it('should handle mixed hyphens and underscores', () => {
      expect(deriveName('feat/my_cool-feature')).toBe('My Cool Feature');
    });

    it('should handle consecutive special characters', () => {
      expect(deriveName('feat/--double--hyphens--')).toBe('Double Hyphens');
    });

    it('should handle already-clean single word', () => {
      expect(deriveName('dashboard')).toBe('Dashboard');
    });

    it('should return the original branch if prefix strip results in empty string', () => {
      expect(deriveName('feat/')).toBe('feat/');
    });

    it('should only strip the first matching prefix', () => {
      expect(deriveName('feat/fix/something')).toBe('Fix Something');
    });

    it('should handle branch names with dots', () => {
      expect(deriveName('feature.branch.name')).toBe('Feature.branch.name');
    });
  });

  describe('deriveSlug', () => {
    it('should convert slashes to hyphens and lowercase', () => {
      expect(deriveSlug('fix/login-bug')).toBe('fix-login-bug');
    });

    it('should preserve the full branch name (including prefix) in slug', () => {
      expect(deriveSlug('feat/user-auth')).toBe('feat-user-auth');
    });

    it('should return the branch as-is when already a valid slug', () => {
      expect(deriveSlug('my-cool-feature')).toBe('my-cool-feature');
    });

    it('should handle nested slashes', () => {
      expect(deriveSlug('feat/auth/login-bug')).toBe('feat-auth-login-bug');
    });

    it('should convert dots to hyphens', () => {
      expect(deriveSlug('release/v1.0.0')).toBe('release-v1-0-0');
    });

    it('should convert underscores to hyphens', () => {
      expect(deriveSlug('my_cool_feature')).toBe('my-cool-feature');
    });

    it('should collapse consecutive hyphens', () => {
      expect(deriveSlug('feat/--double--hyphens')).toBe('feat-double-hyphens');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(deriveSlug('-leading-trailing-')).toBe('leading-trailing');
    });

    it('should lowercase uppercase characters', () => {
      expect(deriveSlug('Feat/MyFeature')).toBe('feat-myfeature');
    });

    it('should handle single word branch', () => {
      expect(deriveSlug('dashboard')).toBe('dashboard');
    });

    it('should handle branch with mixed special characters', () => {
      expect(deriveSlug('feat/auth_login.v2')).toBe('feat-auth-login-v2');
    });
  });
});

// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { validateFolderInput } from '../../../../../src/presentation/web/app/api/validate-folder-input.js';

describe('validateFolderInput', () => {
  it('returns validated repositoryPath for a valid absolute path', () => {
    const result = validateFolderInput({ repositoryPath: '/home/user/project' });

    expect(result).toEqual({ repositoryPath: '/home/user/project' });
  });

  it('returns error 400 for empty repositoryPath', () => {
    const result = validateFolderInput({ repositoryPath: '' });

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for missing repositoryPath', () => {
    const result = validateFolderInput({});

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for non-string repositoryPath', () => {
    const result = validateFolderInput({ repositoryPath: 123 });

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for relative path', () => {
    const result = validateFolderInput({ repositoryPath: 'relative/path' });

    expect(result).toEqual({
      error: 'repositoryPath must be an absolute path (starting with /)',
      status: 400,
    });
  });

  it('returns error 400 for path containing ".."', () => {
    const result = validateFolderInput({ repositoryPath: '/home/../etc/passwd' });

    expect(result).toEqual({
      error: 'repositoryPath must not contain path traversal sequences (..)',
      status: 400,
    });
  });

  it('returns error 400 for path that is just "/.."', () => {
    const result = validateFolderInput({ repositoryPath: '/..' });

    expect(result).toEqual({
      error: 'repositoryPath must not contain path traversal sequences (..)',
      status: 400,
    });
  });

  it('returns error 400 for path containing null bytes', () => {
    const result = validateFolderInput({ repositoryPath: '/home/user\0injection' });

    expect(result).toEqual({
      error: 'repositoryPath must not contain null bytes',
      status: 400,
    });
  });

  it('accepts path with single dots (not traversal)', () => {
    const result = validateFolderInput({ repositoryPath: '/home/user/.config' });

    expect(result).toEqual({ repositoryPath: '/home/user/.config' });
  });

  it('accepts path with version-like dots', () => {
    const result = validateFolderInput({ repositoryPath: '/opt/app/v1.2.3' });

    expect(result).toEqual({ repositoryPath: '/opt/app/v1.2.3' });
  });
});

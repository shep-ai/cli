// @vitest-environment node

import { describe, it, expect } from 'vitest';
import { validateToolbarInput } from '../../../../../src/presentation/web/app/api/validate-toolbar-input.js';

describe('validateToolbarInput', () => {
  it('returns validated inputs for valid repositoryPath and branch', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: 'feat/my-feature',
    });

    expect(result).toEqual({
      repositoryPath: '/home/user/project',
      branch: 'feat/my-feature',
    });
  });

  it('returns error 400 for empty repositoryPath', () => {
    const result = validateToolbarInput({ repositoryPath: '', branch: 'main' });

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for missing repositoryPath', () => {
    const result = validateToolbarInput({ branch: 'main' });

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for non-string repositoryPath', () => {
    const result = validateToolbarInput({ repositoryPath: 123, branch: 'main' });

    expect(result).toEqual({
      error: 'repositoryPath is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for relative repositoryPath', () => {
    const result = validateToolbarInput({
      repositoryPath: 'relative/path',
      branch: 'main',
    });

    expect(result).toEqual({
      error: 'repositoryPath must be an absolute path (starting with /)',
      status: 400,
    });
  });

  it('returns error 400 for empty branch', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: '',
    });

    expect(result).toEqual({
      error: 'branch is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns valid input when branch is omitted', () => {
    const result = validateToolbarInput({ repositoryPath: '/home/user/project' });

    expect(result).toEqual({
      repositoryPath: '/home/user/project',
      branch: undefined,
    });
  });

  it('returns valid input when branch is undefined', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: undefined,
    });

    expect(result).toEqual({
      repositoryPath: '/home/user/project',
      branch: undefined,
    });
  });

  it('returns error 400 for non-string branch', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: null,
    });

    expect(result).toEqual({
      error: 'branch is required and must be a non-empty string',
      status: 400,
    });
  });

  it('returns error 400 for branch containing ".."', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: 'feat/../etc/passwd',
    });

    expect(result).toEqual({
      error: 'branch must not contain path traversal sequences (..)',
      status: 400,
    });
  });

  it('returns error 400 for branch that is just ".."', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: '..',
    });

    expect(result).toEqual({
      error: 'branch must not contain path traversal sequences (..)',
      status: 400,
    });
  });

  it('returns error 400 for branch containing null bytes', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: 'feat/test\0injection',
    });

    expect(result).toEqual({
      error: 'branch must not contain null bytes',
      status: 400,
    });
  });

  it('accepts branch with dots that are not traversal sequences', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: 'feat/v1.2.3',
    });

    expect(result).toEqual({
      repositoryPath: '/home/user/project',
      branch: 'feat/v1.2.3',
    });
  });

  it('accepts branch with single dot', () => {
    const result = validateToolbarInput({
      repositoryPath: '/home/user/project',
      branch: 'feat/.hidden',
    });

    expect(result).toEqual({
      repositoryPath: '/home/user/project',
      branch: 'feat/.hidden',
    });
  });
});

import { describe, it, expect } from 'vitest';
import { deriveState } from '@/app/derive-state';

describe('deriveState', () => {
  it('returns done state for maintain lifecycle', () => {
    const result = deriveState('maintain', undefined);
    expect(result).toEqual({ state: 'done', progress: 100 });
  });

  it('returns done state for completed agent status', () => {
    const result = deriveState('implementation', 'completed');
    expect(result).toEqual({ state: 'done', progress: 100 });
  });

  it('returns error state for failed agent status', () => {
    const result = deriveState('implementation', 'failed');
    expect(result).toEqual({ state: 'error', progress: 0 });
  });

  it('returns action-required state for waiting_approval agent status', () => {
    const result = deriveState('implementation', 'waiting_approval');
    expect(result).toEqual({ state: 'action-required', progress: 0 });
  });

  it('returns running state when no agent status', () => {
    const result = deriveState('implementation', undefined);
    expect(result).toEqual({ state: 'running', progress: 0 });
  });

  it('returns running state for running agent status', () => {
    const result = deriveState('implementation', 'running');
    expect(result).toEqual({ state: 'running', progress: 0 });
  });
});

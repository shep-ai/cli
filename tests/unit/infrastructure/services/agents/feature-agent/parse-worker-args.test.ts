/**
 * parseWorkerArgs Unit Tests - Resume Payload
 */

import { describe, it, expect } from 'vitest';
import { parseWorkerArgs } from '@/infrastructure/services/agents/feature-agent/feature-agent-worker.js';

describe('parseWorkerArgs - resumePayload', () => {
  const baseArgs = [
    '--feature-id',
    'feat-001',
    '--run-id',
    'run-001',
    '--repo',
    '/tmp/repo',
    '--spec-dir',
    '/tmp/spec',
  ];

  it('should parse --resume-payload when present', () => {
    const payload = JSON.stringify({
      approved: true,
      changedSelections: [{ questionId: 'q1', selectedOption: 'A' }],
    });
    const args = parseWorkerArgs([...baseArgs, '--resume-payload', payload]);
    expect(args.resumePayload).toBe(payload);
  });

  it('should set resumePayload to undefined when not present', () => {
    const args = parseWorkerArgs(baseArgs);
    expect(args.resumePayload).toBeUndefined();
  });

  it('should parse rejection payload', () => {
    const payload = JSON.stringify({ rejected: true, feedback: 'fix X', iteration: 2 });
    const args = parseWorkerArgs([...baseArgs, '--resume-payload', payload]);
    expect(args.resumePayload).toBe(payload);
  });

  it('should coexist with other flags', () => {
    const payload = JSON.stringify({ approved: true });
    const args = parseWorkerArgs([
      ...baseArgs,
      '--resume',
      '--resume-from-interrupt',
      '--resume-payload',
      payload,
      '--thread-id',
      'thread-001',
    ]);
    expect(args.resumePayload).toBe(payload);
    expect(args.resume).toBe(true);
    expect(args.resumeFromInterrupt).toBe(true);
    expect(args.threadId).toBe('thread-001');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// Suppress node logger output
vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

import { createValidateNode } from '@/infrastructure/services/agents/feature-agent/nodes/validate.node.js';
import type { FeatureAgentState } from '@/infrastructure/services/agents/feature-agent/state.js';

describe('createValidateNode', () => {
  let tempDir: string;
  let specDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-validate-test-'));
    specDir = join(tempDir, 'specs', 'test');
    mkdirSync(specDir, { recursive: true });
  });

  function makeState(overrides: Partial<FeatureAgentState> = {}): FeatureAgentState {
    return {
      featureId: 'feat-001',
      repositoryPath: tempDir,
      worktreePath: tempDir,
      specDir,
      currentNode: 'test',
      error: null,
      approvalGates: undefined,
      messages: [],
      validationRetries: 0,
      lastValidationTarget: '',
      lastValidationErrors: [],
      ...overrides,
    } as FeatureAgentState;
  }

  it('returns empty errors on valid YAML', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\nvalue: 42\n');
    const schema = vi.fn().mockReturnValue({ valid: true, errors: [] });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors).toEqual([]);
    expect(result.validationRetries).toBe(0);
    expect(schema).toHaveBeenCalledWith({ name: 'hello', value: 42 });
  });

  it('returns errors on schema failure and increments retries', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\n');
    const schema = vi.fn().mockReturnValue({
      valid: false,
      errors: ["Missing required field 'value'"],
    });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors).toEqual(["Missing required field 'value'"]);
    expect(result.validationRetries).toBe(1);
    expect(result.lastValidationTarget).toBe('test.yaml');
  });

  it('returns parse error when YAML is malformed', async () => {
    writeFileSync(join(specDir, 'test.yaml'), '  bad:\n indent\n  broken');
    const schema = vi.fn();
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState());
    expect(result.lastValidationErrors!.length).toBe(1);
    expect(result.lastValidationErrors![0]).toContain('YAML parse error');
    expect(result.validationRetries).toBe(1);
    expect(schema).not.toHaveBeenCalled();
  });

  it('accumulates retry count across invocations', async () => {
    writeFileSync(join(specDir, 'test.yaml'), 'name: hello\n');
    const schema = vi.fn().mockReturnValue({
      valid: false,
      errors: ['bad'],
    });
    const node = createValidateNode('test.yaml', schema);

    const result = await node(makeState({ validationRetries: 2 }));
    expect(result.validationRetries).toBe(3);
  });
});

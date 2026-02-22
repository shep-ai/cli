/**
 * writeSpecFileAtomic Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeSpecFileAtomic } from '@/infrastructure/services/agents/feature-agent/nodes/node-helpers.js';

describe('writeSpecFileAtomic', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'shep-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('should write content to the target file', () => {
    const content = 'name: test\nsummary: hello\n';
    writeSpecFileAtomic(tempDir, 'spec.yaml', content);

    const result = readFileSync(join(tempDir, 'spec.yaml'), 'utf-8');
    expect(result).toBe(content);
  });

  it('should not leave a .tmp file after success', () => {
    writeSpecFileAtomic(tempDir, 'spec.yaml', 'content');

    expect(existsSync(join(tempDir, '.spec.yaml.tmp'))).toBe(false);
  });

  it('should replace an existing file entirely', () => {
    writeFileSync(join(tempDir, 'spec.yaml'), 'old content', 'utf-8');

    writeSpecFileAtomic(tempDir, 'spec.yaml', 'new content');

    const result = readFileSync(join(tempDir, 'spec.yaml'), 'utf-8');
    expect(result).toBe('new content');
  });

  it('should work with feature.yaml filename', () => {
    const content = 'status:\n  phase: implementation\n';
    writeSpecFileAtomic(tempDir, 'feature.yaml', content);

    const result = readFileSync(join(tempDir, 'feature.yaml'), 'utf-8');
    expect(result).toBe(content);
  });
});

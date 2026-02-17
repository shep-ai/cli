import { describe, it, expect, vi, beforeEach } from 'vitest';
import yaml from 'js-yaml';
import { join } from 'node:path';

// Use vi.hoisted so the mock fns are available when vi.mock factory runs
const { mockReadFileSync, mockWriteFileSync } = vi.hoisted(() => ({
  mockReadFileSync: vi.fn(),
  mockWriteFileSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: { ...actual, readFileSync: mockReadFileSync, writeFileSync: mockWriteFileSync },
    readFileSync: mockReadFileSync,
    writeFileSync: mockWriteFileSync,
  };
});

import { generatePrYaml } from '../../../../../../../src/infrastructure/services/agents/feature-agent/nodes/pr-yaml-generator.js';

describe('generatePrYaml', () => {
  const specDir = '/tmp/specs/020-my-feature';
  const branch = 'feat/my-feature';

  const specYaml: Record<string, unknown> = {
    name: 'My Feature',
    description: 'A cool new feature for the CLI',
    scope: 'cli',
    successCriteria: ['Users can do X', 'Performance is under 200ms'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue(yaml.dump(specYaml));
  });

  it('generates pr.yaml with correct conventional commit title', () => {
    const result = generatePrYaml(specDir, branch);

    expect(mockWriteFileSync).toHaveBeenCalledOnce();
    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.title).toBe('feat(cli): My Feature');
    expect(result).toBe(join(specDir, 'pr.yaml'));
  });

  it('includes spec description in the body', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.body).toContain('A cool new feature for the CLI');
  });

  it('includes success criteria in the body', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.body).toContain('Users can do X');
    expect(parsed.body).toContain('Performance is under 200ms');
  });

  it('uses default baseBranch of main', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.baseBranch).toBe('main');
  });

  it('accepts a custom baseBranch', () => {
    generatePrYaml(specDir, branch, 'develop');

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.baseBranch).toBe('develop');
  });

  it('sets headBranch to the provided branch', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.headBranch).toBe('feat/my-feature');
  });

  it('defaults draft to false', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.draft).toBe(false);
  });

  it('includes feature label', () => {
    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.labels).toEqual(expect.arrayContaining(['feature']));
  });

  it('writes the file to specDir/pr.yaml', () => {
    const result = generatePrYaml(specDir, branch);

    const expectedPath = join(specDir, 'pr.yaml');
    expect(result).toBe(expectedPath);
    expect(mockWriteFileSync).toHaveBeenCalledWith(expectedPath, expect.any(String), 'utf-8');
  });

  it('reads spec.yaml from the specDir', () => {
    generatePrYaml(specDir, branch);

    expect(mockReadFileSync).toHaveBeenCalledWith(join(specDir, 'spec.yaml'), 'utf-8');
  });

  it('uses a default scope when spec has no scope field', () => {
    const specWithoutScope = { ...specYaml };
    delete specWithoutScope.scope;
    mockReadFileSync.mockReturnValue(yaml.dump(specWithoutScope));

    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.title).toBe('feat: My Feature');
  });

  it('handles missing successCriteria gracefully', () => {
    const specWithoutCriteria = { name: 'My Feature', description: 'Desc', scope: 'cli' };
    mockReadFileSync.mockReturnValue(yaml.dump(specWithoutCriteria));

    generatePrYaml(specDir, branch);

    const [, content] = mockWriteFileSync.mock.calls[0] as [string, string, string];
    const parsed = yaml.load(content) as Record<string, unknown>;

    expect(parsed.title).toBe('feat(cli): My Feature');
    expect(parsed.body).toBeDefined();
  });
});

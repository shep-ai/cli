import { describe, it, expect } from 'vitest';
import {
  toDatabase,
  fromDatabase,
  type FeatureRow,
} from '@/infrastructure/persistence/sqlite/mappers/feature.mapper.js';
import type { Feature, Attachment } from '@/domain/generated/output.js';

const sampleAttachment: Attachment = {
  id: 'att-001',
  name: 'screenshot.png',
  size: BigInt(150000),
  mimeType: 'image/png',
  path: '.shep/attachments/my-feature/screenshot.png',
  createdAt: new Date('2026-03-08T10:00:00Z'),
};

function createTestFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 'feat-abc-123',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    userQuery: 'test query',
    repositoryPath: '/home/dev/repo',
    branch: 'feature/test-feature',
    lifecycle: 'Started' as Feature['lifecycle'],
    messages: [],
    relatedArtifacts: [],
    push: false,
    openPr: false,
    fast: false,
    approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
    createdAt: new Date('2026-03-08T10:00:00Z'),
    updatedAt: new Date('2026-03-08T10:00:00Z'),
    ...overrides,
  };
}

function createTestRow(overrides: Partial<FeatureRow> = {}): FeatureRow {
  return {
    id: 'feat-abc-123',
    name: 'Test Feature',
    slug: 'test-feature',
    description: 'A test feature',
    user_query: 'test query',
    repository_path: '/home/dev/repo',
    branch: 'feature/test-feature',
    lifecycle: 'Started',
    messages: '[]',
    plan: null,
    related_artifacts: '[]',
    agent_run_id: null,
    spec_path: null,
    push: 0,
    open_pr: 0,
    auto_merge: 0,
    allow_prd: 0,
    allow_plan: 0,
    allow_merge: 0,
    worktree_path: null,
    repository_id: null,
    pr_url: null,
    pr_number: null,
    pr_status: null,
    commit_hash: null,
    ci_status: null,
    ci_fix_attempts: null,
    ci_fix_history: null,
    parent_id: null,
    fast: 0,
    attachments: '[]',
    created_at: new Date('2026-03-08T10:00:00Z').getTime(),
    updated_at: new Date('2026-03-08T10:00:00Z').getTime(),
    ...overrides,
  };
}

describe('Feature Mapper — attachments', () => {
  describe('toDatabase()', () => {
    it('serializes attachments array to JSON string', () => {
      const feature = createTestFeature({ attachments: [sampleAttachment] });
      const row = toDatabase(feature);
      // BigInt size is converted to number for JSON serialization
      const expected = JSON.stringify([
        { ...sampleAttachment, size: Number(sampleAttachment.size) },
      ]);
      expect(row.attachments).toBe(expected);
    });

    it('serializes empty attachments to "[]"', () => {
      const feature = createTestFeature({ attachments: [] });
      const row = toDatabase(feature);
      expect(row.attachments).toBe('[]');
    });

    it('serializes undefined attachments to "[]"', () => {
      const feature = createTestFeature();
      const row = toDatabase(feature);
      expect(row.attachments).toBe('[]');
    });
  });

  describe('fromDatabase()', () => {
    it('deserializes JSON string to Attachment array', () => {
      // In the DB, size is stored as number (BigInt converted on write)
      const storedAttachment = { ...sampleAttachment, size: Number(sampleAttachment.size) };
      const row = createTestRow({
        attachments: JSON.stringify([storedAttachment]),
      });
      const feature = fromDatabase(row);
      // JSON roundtrip: Date → ISO string, BigInt → number — consistent with messages/artifacts
      expect(feature.attachments).toEqual([
        { ...storedAttachment, createdAt: '2026-03-08T10:00:00.000Z' },
      ]);
    });

    it('deserializes "[]" to empty array', () => {
      const row = createTestRow({ attachments: '[]' });
      const feature = fromDatabase(row);
      expect(feature.attachments).toEqual([]);
    });

    it('defaults to empty array when attachments column is missing (pre-migration row)', () => {
      const row = createTestRow();
      // Simulate pre-migration row where column doesn't exist
      delete (row as unknown as Record<string, unknown>).attachments;
      const feature = fromDatabase(row);
      expect(feature.attachments).toEqual([]);
    });
  });
});

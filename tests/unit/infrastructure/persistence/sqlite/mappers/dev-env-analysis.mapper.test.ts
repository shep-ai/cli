import { describe, it, expect } from 'vitest';
import {
  toDatabase,
  fromDatabase,
  type DevEnvAnalysisRow,
} from '@/infrastructure/persistence/sqlite/mappers/dev-env-analysis.mapper.js';
import type { DevEnvironmentAnalysis } from '@/domain/generated/output.js';
import { AnalysisSource } from '@/domain/generated/output.js';

function createTestAnalysis(
  overrides: Partial<DevEnvironmentAnalysis> = {}
): DevEnvironmentAnalysis {
  return {
    id: 'analysis-001',
    cacheKey: 'git@github.com:org/repo.git',
    canStart: true,
    commands: [
      { command: 'npm run dev', description: 'Start Next.js dev server' },
      { command: 'npm run db:seed', description: 'Seed database', workingDirectory: 'packages/db' },
    ],
    prerequisites: ['Node.js 18+', 'Docker'],
    ports: [3000, 5432],
    environmentVariables: {
      DATABASE_URL: 'postgresql://localhost:5432/dev',
      NODE_ENV: 'development',
    },
    language: 'TypeScript',
    framework: 'Next.js',
    source: AnalysisSource.Agent,
    createdAt: new Date('2025-06-01T10:00:00Z'),
    updatedAt: new Date('2025-06-01T12:00:00Z'),
    ...overrides,
  };
}

function createTestRow(overrides: Partial<DevEnvAnalysisRow> = {}): DevEnvAnalysisRow {
  return {
    id: 'analysis-001',
    cache_key: 'git@github.com:org/repo.git',
    can_start: 1,
    reason: null,
    commands: JSON.stringify([
      { command: 'npm run dev', description: 'Start Next.js dev server' },
      { command: 'npm run db:seed', description: 'Seed database', workingDirectory: 'packages/db' },
    ]),
    prerequisites: JSON.stringify(['Node.js 18+', 'Docker']),
    ports: JSON.stringify([3000, 5432]),
    environment_variables: JSON.stringify({
      DATABASE_URL: 'postgresql://localhost:5432/dev',
      NODE_ENV: 'development',
    }),
    language: 'TypeScript',
    framework: 'Next.js',
    source: 'Agent',
    created_at: new Date('2025-06-01T10:00:00Z').getTime(),
    updated_at: new Date('2025-06-01T12:00:00Z').getTime(),
    ...overrides,
  };
}

describe('DevEnvAnalysis Mapper', () => {
  describe('toDatabase', () => {
    it('should map all fields to snake_case columns', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      expect(row.id).toBe('analysis-001');
      expect(row.cache_key).toBe('git@github.com:org/repo.git');
      expect(row.can_start).toBe(1);
      expect(row.reason).toBeNull();
      expect(row.language).toBe('TypeScript');
      expect(row.framework).toBe('Next.js');
      expect(row.source).toBe('Agent');
    });

    it('should convert canStart boolean to integer', () => {
      const trueAnalysis = createTestAnalysis({ canStart: true });
      expect(toDatabase(trueAnalysis).can_start).toBe(1);

      const falseAnalysis = createTestAnalysis({ canStart: false });
      expect(toDatabase(falseAnalysis).can_start).toBe(0);
    });

    it('should JSON.stringify commands array', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      const parsed = JSON.parse(row.commands);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].command).toBe('npm run dev');
      expect(parsed[1].workingDirectory).toBe('packages/db');
    });

    it('should JSON.stringify prerequisites array', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      expect(JSON.parse(row.prerequisites!)).toEqual(['Node.js 18+', 'Docker']);
    });

    it('should JSON.stringify ports array', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      expect(JSON.parse(row.ports!)).toEqual([3000, 5432]);
    });

    it('should JSON.stringify environmentVariables object', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      expect(JSON.parse(row.environment_variables!)).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/dev',
        NODE_ENV: 'development',
      });
    });

    it('should convert Date objects to unix milliseconds', () => {
      const analysis = createTestAnalysis();
      const row = toDatabase(analysis);

      expect(row.created_at).toBe(new Date('2025-06-01T10:00:00Z').getTime());
      expect(row.updated_at).toBe(new Date('2025-06-01T12:00:00Z').getTime());
    });

    it('should handle optional fields as null when undefined', () => {
      const analysis = createTestAnalysis({
        reason: undefined,
        prerequisites: undefined,
        ports: undefined,
        environmentVariables: undefined,
        framework: undefined,
      });
      const row = toDatabase(analysis);

      expect(row.reason).toBeNull();
      expect(row.prerequisites).toBeNull();
      expect(row.ports).toBeNull();
      expect(row.environment_variables).toBeNull();
      expect(row.framework).toBeNull();
    });

    it('should map reason string when present', () => {
      const analysis = createTestAnalysis({
        canStart: false,
        reason: 'This is a utility library with no server',
        commands: [],
      });
      const row = toDatabase(analysis);

      expect(row.reason).toBe('This is a utility library with no server');
    });
  });

  describe('fromDatabase', () => {
    it('should map all columns to camelCase fields', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.id).toBe('analysis-001');
      expect(analysis.cacheKey).toBe('git@github.com:org/repo.git');
      expect(analysis.canStart).toBe(true);
      expect(analysis.language).toBe('TypeScript');
      expect(analysis.framework).toBe('Next.js');
      expect(analysis.source).toBe(AnalysisSource.Agent);
    });

    it('should convert can_start integer to boolean', () => {
      expect(fromDatabase(createTestRow({ can_start: 1 })).canStart).toBe(true);
      expect(fromDatabase(createTestRow({ can_start: 0 })).canStart).toBe(false);
    });

    it('should parse commands JSON string to DevCommand array', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.commands).toHaveLength(2);
      expect(analysis.commands[0].command).toBe('npm run dev');
      expect(analysis.commands[0].description).toBe('Start Next.js dev server');
      expect(analysis.commands[1].workingDirectory).toBe('packages/db');
    });

    it('should parse prerequisites JSON string to string array', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.prerequisites).toEqual(['Node.js 18+', 'Docker']);
    });

    it('should parse ports JSON string to number array', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.ports).toEqual([3000, 5432]);
    });

    it('should parse environment_variables JSON string to Record', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.environmentVariables).toEqual({
        DATABASE_URL: 'postgresql://localhost:5432/dev',
        NODE_ENV: 'development',
      });
    });

    it('should convert unix milliseconds back to Date objects', () => {
      const row = createTestRow();
      const analysis = fromDatabase(row);

      expect(analysis.createdAt).toBeInstanceOf(Date);
      expect(analysis.updatedAt).toBeInstanceOf(Date);
      expect(analysis.createdAt).toEqual(new Date('2025-06-01T10:00:00Z'));
      expect(analysis.updatedAt).toEqual(new Date('2025-06-01T12:00:00Z'));
    });

    it('should exclude optional fields when null in row', () => {
      const row = createTestRow({
        reason: null,
        prerequisites: null,
        ports: null,
        environment_variables: null,
        framework: null,
      });
      const analysis = fromDatabase(row);

      expect(analysis.reason).toBeUndefined();
      expect(analysis.prerequisites).toBeUndefined();
      expect(analysis.ports).toBeUndefined();
      expect(analysis.environmentVariables).toBeUndefined();
      expect(analysis.framework).toBeUndefined();
    });

    it('should include reason when present', () => {
      const row = createTestRow({
        can_start: 0,
        reason: 'No startable server found',
      });
      const analysis = fromDatabase(row);

      expect(analysis.reason).toBe('No startable server found');
    });

    it('should cast source string to AnalysisSource enum', () => {
      expect(fromDatabase(createTestRow({ source: 'FastPath' })).source).toBe(
        AnalysisSource.FastPath
      );
      expect(fromDatabase(createTestRow({ source: 'Agent' })).source).toBe(AnalysisSource.Agent);
      expect(fromDatabase(createTestRow({ source: 'Manual' })).source).toBe(AnalysisSource.Manual);
    });
  });

  describe('round-trip', () => {
    it('should preserve all data through toDatabase -> fromDatabase', () => {
      const original = createTestAnalysis();
      const row = toDatabase(original);
      const restored = fromDatabase(row);

      expect(restored.id).toBe(original.id);
      expect(restored.cacheKey).toBe(original.cacheKey);
      expect(restored.canStart).toBe(original.canStart);
      expect(restored.commands).toEqual(original.commands);
      expect(restored.prerequisites).toEqual(original.prerequisites);
      expect(restored.ports).toEqual(original.ports);
      expect(restored.environmentVariables).toEqual(original.environmentVariables);
      expect(restored.language).toBe(original.language);
      expect(restored.framework).toBe(original.framework);
      expect(restored.source).toBe(original.source);
      expect(restored.createdAt).toEqual(original.createdAt);
      expect(restored.updatedAt).toEqual(original.updatedAt);
    });

    it('should preserve data through round-trip with canStart=false', () => {
      const original = createTestAnalysis({
        canStart: false,
        reason: 'Pure CLI utility with no server component',
        commands: [],
        ports: undefined,
        prerequisites: undefined,
        environmentVariables: undefined,
        framework: undefined,
      });
      const row = toDatabase(original);
      const restored = fromDatabase(row);

      expect(restored.canStart).toBe(false);
      expect(restored.reason).toBe(original.reason);
      expect(restored.commands).toEqual([]);
      expect(restored.ports).toBeUndefined();
      expect(restored.prerequisites).toBeUndefined();
      expect(restored.environmentVariables).toBeUndefined();
      expect(restored.framework).toBeUndefined();
    });

    it('should preserve commands with workingDirectory through round-trip', () => {
      const original = createTestAnalysis({
        commands: [
          { command: 'pnpm dev', description: 'Start monorepo dev', workingDirectory: 'apps/web' },
        ],
      });
      const restored = fromDatabase(toDatabase(original));

      expect(restored.commands[0].workingDirectory).toBe('apps/web');
    });
  });
});

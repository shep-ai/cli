// @vitest-environment node

import 'reflect-metadata';

/**
 * DevEnvironmentAnalyzerService Unit Tests
 *
 * Tests the two-mode analyzer: fast path (detectDevScript) and agent path
 * (StructuredAgentCaller with pre-read config files).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { DevEnvironmentAnalyzerService } from '@/infrastructure/services/deployment/dev-environment-analyzer.service.js';
import type { IStructuredAgentCaller } from '@/application/ports/output/agents/structured-agent-caller.interface.js';
import { StructuredCallError } from '@/application/ports/output/agents/structured-call-error.js';

function createMockCaller(response?: unknown): IStructuredAgentCaller {
  return {
    call: vi.fn().mockResolvedValue(
      response ?? {
        canStart: true,
        commands: [
          { command: 'python manage.py runserver', description: 'Start Django dev server' },
        ],
        language: 'Python',
        framework: 'Django',
        ports: [8000],
        prerequisites: ['Python 3.10+'],
      }
    ),
  };
}

describe('DevEnvironmentAnalyzerService', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'analyzer-test-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('autoDetectMode', () => {
    it('should return "fast" when package.json has a dev script', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'next dev' } })
      );

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const mode = analyzer.autoDetectMode(tempDir);

      expect(mode).toBe('fast');
    });

    it('should return "fast" when package.json has a start script', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { start: 'node server.js' } })
      );

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const mode = analyzer.autoDetectMode(tempDir);

      expect(mode).toBe('fast');
    });

    it('should return "fast" when package.json has a serve script', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { serve: 'vite serve' } })
      );

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const mode = analyzer.autoDetectMode(tempDir);

      expect(mode).toBe('fast');
    });

    it('should return "agent" when no package.json exists', () => {
      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const mode = analyzer.autoDetectMode(tempDir);

      expect(mode).toBe('agent');
    });

    it('should return "agent" when package.json has no matching scripts', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { build: 'tsc', lint: 'eslint .' } })
      );

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const mode = analyzer.autoDetectMode(tempDir);

      expect(mode).toBe('agent');
    });
  });

  describe('analyze - fast mode', () => {
    it('should return DevEnvironmentAnalysis with correct fields from detectDevScript', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'next dev' } })
      );

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const result = await analyzer.analyze(tempDir, 'fast');

      expect(result.canStart).toBe(true);
      expect(result.source).toBe('FastPath');
      expect(result.language).toBe('JavaScript');
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].command).toContain('dev');
      expect(result.id).toBeTruthy();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should return canStart:false with reason when detectDevScript fails', async () => {
      // No package.json exists

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const result = await analyzer.analyze(tempDir, 'fast');

      expect(result.canStart).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain('package.json');
      expect(result.source).toBe('FastPath');
      expect(result.commands).toEqual([]);
    });

    it('should detect pnpm package manager', async () => {
      await writeFile(join(tempDir, 'package.json'), JSON.stringify({ scripts: { dev: 'vite' } }));
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '');

      const analyzer = new DevEnvironmentAnalyzerService(createMockCaller());
      const result = await analyzer.analyze(tempDir, 'fast');

      expect(result.canStart).toBe(true);
      expect(result.commands[0].command).toBe('pnpm dev');
    });

    it('should not call the agent in fast mode', async () => {
      await writeFile(
        join(tempDir, 'package.json'),
        JSON.stringify({ scripts: { dev: 'next dev' } })
      );

      const mockCaller = createMockCaller();
      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      await analyzer.analyze(tempDir, 'fast');

      expect(mockCaller.call).not.toHaveBeenCalled();
    });
  });

  describe('analyze - agent mode', () => {
    it('should call StructuredAgentCaller with prompt containing config files', async () => {
      await writeFile(join(tempDir, 'pyproject.toml'), '[tool.poetry]\nname = "myapp"');
      await mkdir(join(tempDir, 'src'));

      const mockCaller = createMockCaller();
      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      await analyzer.analyze(tempDir, 'agent');

      expect(mockCaller.call).toHaveBeenCalledTimes(1);
      const [prompt, schema, options] = (mockCaller.call as ReturnType<typeof vi.fn>).mock.calls[0];

      // Prompt should include config file contents
      expect(prompt).toContain('pyproject.toml');
      expect(prompt).toContain('[tool.poetry]');

      // Prompt should include directory listing
      expect(prompt).toContain('src/');

      // Schema should be the DEV_ENV_ANALYSIS_SCHEMA
      expect(schema).toHaveProperty('type', 'object');
      expect(schema).toHaveProperty('required');

      // Options should include silent mode
      expect(options).toHaveProperty('silent', true);
    });

    it('should return DevEnvironmentAnalysis with agent response data', async () => {
      const mockCaller = createMockCaller({
        canStart: true,
        commands: [
          { command: 'python manage.py runserver', description: 'Start Django dev server' },
        ],
        language: 'Python',
        framework: 'Django',
        ports: [8000],
        prerequisites: ['Python 3.10+'],
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      const result = await analyzer.analyze(tempDir, 'agent');

      expect(result.canStart).toBe(true);
      expect(result.source).toBe('Agent');
      expect(result.language).toBe('Python');
      expect(result.framework).toBe('Django');
      expect(result.commands[0].command).toBe('python manage.py runserver');
      expect(result.ports).toEqual([8000]);
      expect(result.prerequisites).toEqual(['Python 3.10+']);
    });

    it('should return canStart:false for library repos', async () => {
      const mockCaller = createMockCaller({
        canStart: false,
        reason: 'This is a utility library with no server or UI component.',
        commands: [],
        language: 'TypeScript',
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      const result = await analyzer.analyze(tempDir, 'agent');

      expect(result.canStart).toBe(false);
      expect(result.reason).toContain('utility library');
      expect(result.commands).toEqual([]);
      expect(result.source).toBe('Agent');
    });

    it('should propagate StructuredCallError from agent', async () => {
      const mockCaller = {
        call: vi
          .fn()
          .mockRejectedValue(new StructuredCallError('No JSON object found', 'parse_failed')),
      };

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);

      await expect(analyzer.analyze(tempDir, 'agent')).rejects.toThrow(StructuredCallError);
    });

    it('should throw when agent returns missing canStart field', async () => {
      const mockCaller = createMockCaller({
        commands: [],
        language: 'Python',
        // canStart is missing
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);

      await expect(analyzer.analyze(tempDir, 'agent')).rejects.toThrow(
        'Agent analysis missing required field: canStart'
      );
    });

    it('should throw when agent returns missing language field', async () => {
      const mockCaller = createMockCaller({
        canStart: true,
        commands: [{ command: 'go run .', description: 'Run Go app' }],
        // language is missing
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);

      await expect(analyzer.analyze(tempDir, 'agent')).rejects.toThrow(
        'Agent analysis missing required field: language'
      );
    });

    it('should handle environmentVariables in agent response', async () => {
      const mockCaller = createMockCaller({
        canStart: true,
        commands: [{ command: 'npm run dev', description: 'Start dev' }],
        language: 'TypeScript',
        environmentVariables: { DATABASE_URL: 'postgres://localhost:5432/mydb', PORT: '3000' },
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      const result = await analyzer.analyze(tempDir, 'agent');

      expect(result.environmentVariables).toEqual({
        DATABASE_URL: 'postgres://localhost:5432/mydb',
        PORT: '3000',
      });
    });

    it('should omit optional fields that are not present in agent response', async () => {
      const mockCaller = createMockCaller({
        canStart: true,
        commands: [{ command: 'cargo run', description: 'Run Rust app' }],
        language: 'Rust',
      });

      const analyzer = new DevEnvironmentAnalyzerService(mockCaller);
      const result = await analyzer.analyze(tempDir, 'agent');

      expect(result.reason).toBeUndefined();
      expect(result.prerequisites).toBeUndefined();
      expect(result.ports).toBeUndefined();
      expect(result.environmentVariables).toBeUndefined();
      expect(result.framework).toBeUndefined();
    });
  });
});

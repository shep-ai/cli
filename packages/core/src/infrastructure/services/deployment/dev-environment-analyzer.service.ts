/**
 * Dev Environment Analyzer Service
 *
 * Two-mode analyzer for repository development environments:
 * - Fast mode: Deterministic package.json detection via existing detectDevScript
 * - Agent mode: AI-powered analysis via IStructuredAgentCaller with pre-read config files
 *
 * Both modes produce the same DevEnvironmentAnalysis output shape.
 * Agent resolution goes through IAgentExecutorProvider (never hardcoded).
 */

import { randomUUID } from 'node:crypto';
import { injectable, inject } from 'tsyringe';
import type {
  DevEnvironmentAnalysis,
  DevCommand,
  AnalysisSource,
} from '../../../domain/generated/output.js';
import type {
  IDevEnvironmentAnalyzer,
  AnalysisMode,
} from '../../../application/ports/output/services/dev-environment-analyzer.interface.js';
import type { IStructuredAgentCaller } from '../../../application/ports/output/agents/structured-agent-caller.interface.js';
import { detectDevScript } from './detect-dev-script.js';
import { readRepoContext } from './config-file-reader.js';

/** JSON Schema for the agent's DevEnvironmentAnalysis response. */
const DEV_ENV_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    canStart: {
      type: 'boolean',
      description:
        'Whether this repository has a startable dev server or UI. Set to false for pure libraries, CLI tools, or utility scripts with no server component.',
    },
    reason: {
      type: 'string',
      description:
        'Human-readable explanation of why there is nothing to start. Required when canStart is false.',
    },
    commands: {
      type: 'array',
      description:
        'Ordered list of commands to start the dev environment. First command is the primary one that will be executed. Include install/setup commands if needed.',
      items: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description:
              'The shell command to execute (e.g., "npm run dev", "python manage.py runserver")',
          },
          description: {
            type: 'string',
            description: 'Human-readable explanation of what this command does',
          },
          workingDirectory: {
            type: 'string',
            description:
              'Relative path from repo root for the command (for monorepos). Omit if repo root.',
          },
        },
        required: ['command', 'description'],
      },
    },
    prerequisites: {
      type: 'array',
      items: { type: 'string' },
      description:
        'List of prerequisites that must be installed (e.g., "Node.js 18+", "Docker", "Python 3.10+")',
    },
    ports: {
      type: 'array',
      items: { type: 'number' },
      description: 'Expected port numbers the dev server will listen on',
    },
    environmentVariables: {
      type: 'object',
      additionalProperties: { type: 'string' },
      description: 'Environment variables needed to run the dev server (key-value pairs)',
    },
    language: {
      type: 'string',
      description:
        'Primary programming language (e.g., "TypeScript", "Python", "Go", "Rust", "Java", "Ruby")',
    },
    framework: {
      type: 'string',
      description:
        'Primary framework if detected (e.g., "Next.js", "Django", "FastAPI", "Gin", "Rails")',
    },
  },
  required: ['canStart', 'commands', 'language'],
  additionalProperties: false,
} as const;

/** Agent prompt template for repository analysis. */
function buildAgentPrompt(
  repoPath: string,
  files: { filename: string; content: string }[],
  directoryListing: string[]
): string {
  const fileSection =
    files.length > 0
      ? files.map((f) => `### ${f.filename}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
      : 'No config files found.';

  const dirSection = directoryListing.length > 0 ? directoryListing.join('\n') : 'Empty directory.';

  return `Analyze this repository and determine how to start its development environment.

## Repository Path
${repoPath}

## Directory Structure (depth 1)
${dirSection}

## Config Files
${fileSection}

## Instructions
1. Determine the primary programming language and framework (if any).
2. Determine if this repository has a startable dev server or UI.
   - If it's a pure library, CLI tool, utility scripts, or has no server/UI component, set canStart to false and provide a clear reason.
3. If canStart is true, provide the commands needed to start the dev environment.
   - The first command should be the primary dev server command.
   - Include prerequisite install commands if dependencies aren't installed.
4. List any expected ports the dev server will listen on.
5. List any required environment variables.
6. List prerequisites (required tools/runtimes).

Respond with ONLY the JSON object matching the schema.`;
}

@injectable()
export class DevEnvironmentAnalyzerService implements IDevEnvironmentAnalyzer {
  constructor(
    @inject('IStructuredAgentCaller')
    private readonly structuredCaller: IStructuredAgentCaller
  ) {}

  autoDetectMode(repoPath: string): AnalysisMode {
    const detection = detectDevScript(repoPath);
    return detection.success ? 'fast' : 'agent';
  }

  async analyze(repoPath: string, mode: AnalysisMode): Promise<DevEnvironmentAnalysis> {
    if (mode === 'fast') {
      return this.analyzeFast(repoPath);
    }
    return this.analyzeWithAgent(repoPath);
  }

  private analyzeFast(repoPath: string): DevEnvironmentAnalysis {
    const detection = detectDevScript(repoPath);
    const now = new Date();

    if (!detection.success) {
      return {
        id: randomUUID(),
        cacheKey: '',
        canStart: false,
        reason: detection.error,
        commands: [],
        language: 'Unknown',
        source: 'FastPath' as AnalysisSource,
        createdAt: now,
        updatedAt: now,
      };
    }

    const command: DevCommand = {
      command: detection.command,
      description: `Run ${detection.scriptName} via ${detection.packageManager}`,
    };

    return {
      id: randomUUID(),
      cacheKey: '',
      canStart: true,
      commands: [command],
      language: 'JavaScript',
      framework: this.detectFrameworkFromPackageManager(detection.packageManager),
      source: 'FastPath' as AnalysisSource,
      createdAt: now,
      updatedAt: now,
    };
  }

  private async analyzeWithAgent(repoPath: string): Promise<DevEnvironmentAnalysis> {
    const { files, directoryListing } = await readRepoContext(repoPath);
    const prompt = buildAgentPrompt(repoPath, files, directoryListing);

    const result = await this.structuredCaller.call<{
      canStart: boolean;
      reason?: string;
      commands: { command: string; description: string; workingDirectory?: string }[];
      prerequisites?: string[];
      ports?: number[];
      environmentVariables?: Record<string, string>;
      language: string;
      framework?: string;
    }>(prompt, DEV_ENV_ANALYSIS_SCHEMA, {
      maxTurns: 10,
      allowedTools: [],
      silent: true,
    });

    // Validate required fields
    if (typeof result.canStart !== 'boolean') {
      throw new Error('Agent analysis missing required field: canStart');
    }
    if (!result.language) {
      throw new Error('Agent analysis missing required field: language');
    }

    const now = new Date();

    return {
      id: randomUUID(),
      cacheKey: '',
      canStart: result.canStart,
      commands: result.commands ?? [],
      language: result.language,
      source: 'Agent' as AnalysisSource,
      createdAt: now,
      updatedAt: now,
      ...(result.reason && { reason: result.reason }),
      ...(result.prerequisites && { prerequisites: result.prerequisites }),
      ...(result.ports && { ports: result.ports }),
      ...(result.environmentVariables && { environmentVariables: result.environmentVariables }),
      ...(result.framework && { framework: result.framework }),
    };
  }

  /** Attempt to detect framework from package.json scripts — simple heuristic. */
  private detectFrameworkFromPackageManager(_packageManager: string): string | undefined {
    // Fast path doesn't deeply inspect package.json for framework.
    // The framework field is optional and more reliably detected by the agent path.
    return undefined;
  }
}

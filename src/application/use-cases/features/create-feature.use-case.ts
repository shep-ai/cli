/**
 * Create Feature Use Case
 *
 * Creates a new feature entity with a git worktree for isolated development,
 * initializes the spec directory with YAML templates, then spawns the
 * feature agent to begin autonomous SDLC processing.
 *
 * Business Rules:
 * - AI generates slug/name/description from user's free-text input
 * - Falls back to regex-based slug if AI fails
 * - Full user input is preserved as-is in spec.yaml
 * - Slug must be unique within the repository
 * - A git worktree is created at ~/.shep/repos/HASH/wt/SLUG/
 * - Spec YAML files are scaffolded at WORKTREE/specs/NNN-SLUG/
 * - Feature agent is spawned with the spec dir path
 * - specPath is persisted on the Feature record
 * - Initial lifecycle is Requirements
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { Feature } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { ISpecInitializerService } from '../../ports/output/services/spec-initializer.interface.js';
import type { IAgentExecutorFactory } from '../../ports/output/agents/agent-executor-factory.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';
import { getSettings } from '../../../infrastructure/services/settings.service.js';

/** Maximum characters of user input sent to the AI for metadata generation. */
const MAX_INPUT_FOR_AI = 500;

export interface CreateFeatureInput {
  userInput: string;
  repositoryPath: string;
  approvalMode?: string;
}

interface FeatureMetadata {
  slug: string;
  name: string;
  description: string;
}

@injectable()
export class CreateFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService,
    @inject('IFeatureAgentProcessService')
    private readonly agentProcess: IFeatureAgentProcessService,
    @inject('IAgentRunRepository')
    private readonly runRepository: IAgentRunRepository,
    @inject('ISpecInitializerService')
    private readonly specInitializer: ISpecInitializerService,
    @inject('IAgentExecutorFactory')
    private readonly executorFactory: IAgentExecutorFactory
  ) {}

  async execute(input: CreateFeatureInput): Promise<Feature> {
    const metadata = await this.generateMetadata(input.userInput);
    const slug = metadata.slug;
    const branch = `feat/${slug}`;

    const existing = await this.featureRepo.findBySlug(slug, input.repositoryPath);
    if (existing) {
      throw new Error(`Feature with slug "${slug}" already exists in this repository`);
    }

    // Determine next feature number for this repo
    const existingFeatures = await this.featureRepo.list({
      repositoryPath: input.repositoryPath,
    });
    const featureNumber = existingFeatures.length + 1;

    const now = new Date();
    const runId = randomUUID();

    // Create git worktree for isolated development
    const worktreePath = this.worktreeService.getWorktreePath(input.repositoryPath, branch);
    await this.worktreeService.create(input.repositoryPath, branch, worktreePath);

    // Initialize spec directory — full user input goes into spec.yaml as-is
    const { specDir } = await this.specInitializer.initialize(
      worktreePath,
      slug,
      featureNumber,
      input.userInput
    );

    const feature: Feature = {
      id: randomUUID(),
      name: metadata.name,
      slug,
      description: metadata.description,
      repositoryPath: input.repositoryPath,
      branch,
      lifecycle: SdlcLifecycle.Requirements,
      messages: [],
      relatedArtifacts: [],
      agentRunId: runId,
      specPath: specDir,
      createdAt: now,
      updatedAt: now,
    };

    await this.featureRepo.create(feature);

    // Create agent run record and spawn background worker
    const settings = getSettings();
    const agentRun = {
      id: runId,
      agentType: settings.agent.type,
      agentName: 'feature-agent',
      status: AgentRunStatus.pending,
      prompt: input.userInput,
      threadId: randomUUID(),
      featureId: feature.id,
      repositoryPath: input.repositoryPath,
      ...(input.approvalMode ? { approvalMode: input.approvalMode } : {}),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.runRepository.create(agentRun);

    this.agentProcess.spawn(
      feature.id,
      runId,
      input.repositoryPath,
      specDir,
      worktreePath,
      input.approvalMode ? { approvalMode: input.approvalMode } : undefined
    );

    return feature;
  }

  private async generateMetadata(userInput: string): Promise<FeatureMetadata> {
    try {
      const settings = getSettings();
      const executor = this.executorFactory.createExecutor(settings.agent.type, settings.agent);

      const truncated =
        userInput.length > MAX_INPUT_FOR_AI
          ? `${userInput.slice(0, MAX_INPUT_FOR_AI)}...`
          : userInput;

      const prompt = `Generate feature metadata from this user request:
"${truncated}"

Return ONLY a JSON object with these fields:
- slug: kebab-case identifier, 2-4 words max (e.g., "github-oauth-login")
- name: short human-readable title (e.g., "GitHub OAuth Login")
- description: refined 1-2 sentence description

JSON only, no markdown fences.`;

      const result = await executor.execute(prompt, {
        maxTurns: 1,
        allowedTools: [],
      });

      const parsed = JSON.parse(result.result);
      if (!parsed.slug || !parsed.name || !parsed.description) {
        throw new Error('Missing required fields in AI response');
      }

      return {
        slug: this.toSlug(parsed.slug),
        name: parsed.name,
        description: parsed.description,
      };
    } catch {
      // Fallback to regex-based slug generation
      return {
        slug: this.toSlug(userInput),
        name: userInput,
        description: userInput,
      };
    }
  }

  private toSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}

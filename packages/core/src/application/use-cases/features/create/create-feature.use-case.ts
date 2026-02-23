/**
 * Create Feature Use Case
 *
 * Creates a new feature entity with a git worktree for isolated development,
 * initializes the spec directory with YAML templates, then spawns the
 * feature agent to begin autonomous SDLC processing.
 *
 * Business Rules:
 * - Metadata generation delegated to MetadataGenerator service
 * - Slug uniqueness delegated to SlugResolver service
 * - Full user input is preserved as-is in spec.yaml
 * - A git worktree is created at ~/.shep/repos/HASH/wt/SLUG/
 * - Spec YAML files are scaffolded at WORKTREE/specs/NNN-SLUG/
 * - Feature agent is spawned with the spec dir path
 * - specPath is persisted on the Feature record
 * - Initial lifecycle is Requirements
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { Feature } from '../../../../domain/generated/output.js';
import { SdlcLifecycle, AgentRunStatus } from '../../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../../ports/output/services/worktree-service.interface.js';
import type { IFeatureAgentProcessService } from '../../../ports/output/agents/feature-agent-process.interface.js';
import type { IAgentRunRepository } from '../../../ports/output/agents/agent-run-repository.interface.js';
import type { ISpecInitializerService } from '../../../ports/output/services/spec-initializer.interface.js';
import type { IRepositoryRepository } from '../../../ports/output/repositories/repository-repository.interface.js';
import { getSettings } from '../../../../infrastructure/services/settings.service.js';
import { MetadataGenerator } from './metadata-generator.js';
import { SlugResolver } from './slug-resolver.js';
import type { CreateFeatureInput, CreateFeatureResult } from './types.js';

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
    @inject(MetadataGenerator)
    private readonly metadataGenerator: MetadataGenerator,
    @inject(SlugResolver)
    private readonly slugResolver: SlugResolver,
    @inject('IRepositoryRepository')
    private readonly repositoryRepo: IRepositoryRepository
  ) {}

  async execute(input: CreateFeatureInput): Promise<CreateFeatureResult> {
    const metadata = await this.metadataGenerator.generateMetadata(input.userInput);
    const originalSlug = metadata.slug;

    // Find a unique slug — the branch may exist from a previous (deleted) feature
    const { slug, branch, warning } = await this.slugResolver.resolveUniqueSlug(
      originalSlug,
      input.repositoryPath
    );

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

    // Resolve or create repository entity for this path
    const normalizedPath = input.repositoryPath.replace(/\/+$/, '') || input.repositoryPath;
    let repository = await this.repositoryRepo.findByPath(normalizedPath);
    if (!repository) {
      const repoName = normalizedPath.split('/').pop() ?? normalizedPath;
      repository = {
        id: randomUUID(),
        name: repoName,
        path: normalizedPath,
        createdAt: now,
        updatedAt: now,
      };
      await this.repositoryRepo.create(repository);
    }

    const feature: Feature = {
      id: randomUUID(),
      name: metadata.name,
      slug,
      description: metadata.description,
      userQuery: input.userInput,
      repositoryPath: input.repositoryPath,
      branch,
      lifecycle: SdlcLifecycle.Requirements,
      messages: [],
      relatedArtifacts: [],
      push: input.push ?? false,
      openPr: input.openPr ?? false,
      approvalGates: input.approvalGates ?? {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
      },
      agentRunId: runId,
      specPath: specDir,
      repositoryId: repository.id,
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
      ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.runRepository.create(agentRun);

    this.agentProcess.spawn(feature.id, runId, input.repositoryPath, specDir, worktreePath, {
      ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
      threadId: agentRun.threadId,
      push: input.push ?? false,
      openPr: input.openPr ?? false,
    });

    return { feature, warning };
  }
}

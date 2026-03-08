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
import type { IGitPrService } from '../../../ports/output/services/git-pr-service.interface.js';
import { getSettings } from '../../../../infrastructure/services/settings.service.js';
import { POST_IMPLEMENTATION } from '../../../../domain/lifecycle-gates.js';
import { MetadataGenerator } from './metadata-generator.js';
import { SlugResolver } from './slug-resolver.js';
import type { CreateFeatureInput, CreateFeatureResult, CreateRecordResult } from './types.js';

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
    private readonly repositoryRepo: IRepositoryRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  /**
   * Full synchronous execution: creates record, initializes worktree/spec, spawns agent.
   * Used by the CLI which shows a spinner and needs everything done before returning.
   */
  async execute(input: CreateFeatureInput): Promise<CreateFeatureResult> {
    const { feature, shouldSpawn } = await this.createRecord(input);
    const { warning, updatedFeature } = await this.initializeAndSpawn(feature, input, shouldSpawn);
    return { feature: updatedFeature, warning };
  }

  /**
   * Phase 1 (fast): Creates the feature + agent run records in DB and returns immediately.
   * The feature has a real UUID and a preliminary slug derived from the provided name.
   * No AI calls, no git operations — just DB writes.
   */
  async createRecord(input: CreateFeatureInput): Promise<CreateRecordResult> {
    let initialLifecycle: SdlcLifecycle = input.fast
      ? SdlcLifecycle.Implementation
      : SdlcLifecycle.Requirements;
    let shouldSpawn = true;
    let effectiveRepoPath = input.repositoryPath;

    if (input.parentId) {
      const parent = await this.featureRepo.findById(input.parentId);
      if (!parent) {
        throw new Error(`Parent feature not found: ${input.parentId}`);
      }

      effectiveRepoPath = parent.repositoryPath;

      // Cycle detection — O(depth) upward walk through ancestor chain
      const visited = new Set<string>([input.parentId]);
      let cursor = parent.parentId;
      while (cursor) {
        if (visited.has(cursor)) {
          throw new Error(`Cycle detected in feature dependency chain at feature: ${cursor}`);
        }
        visited.add(cursor);
        const ancestor = await this.featureRepo.findById(cursor);
        cursor = ancestor?.parentId ?? undefined;
      }

      if (
        parent.lifecycle === SdlcLifecycle.Blocked ||
        !POST_IMPLEMENTATION.has(parent.lifecycle)
      ) {
        initialLifecycle = SdlcLifecycle.Blocked;
        shouldSpawn = false;
      } else {
        initialLifecycle = SdlcLifecycle.Started;
        shouldSpawn = true;
      }
    }

    // Resolve or create repository entity for this path
    const normalizedPath = effectiveRepoPath.replace(/\/+$/, '') || effectiveRepoPath;
    let repository = await this.repositoryRepo.findByPath(normalizedPath);
    const now = new Date();
    if (!repository) {
      const repoName = normalizedPath.split('/').pop() ?? normalizedPath;
      repository = {
        id: randomUUID(),
        name: repoName,
        path: normalizedPath,
        createdAt: now,
        updatedAt: now,
      };
      repository = await this.repositoryRepo.create(repository);
      if (!repository) {
        throw new Error(
          `Failed to create or retrieve repository record for path: ${normalizedPath}`
        );
      }
    }

    const featureName = input.name ?? input.userInput.slice(0, 100);
    const runId = randomUUID();
    const featureId = randomUUID();

    // Use the feature ID as a temporary slug so it never collides with the
    // AI-generated slug in initializeAndSpawn() → resolveUniqueSlug().
    const feature: Feature = {
      id: featureId,
      name: featureName,
      slug: featureId,
      description: input.description ?? '',
      userQuery: input.userInput,
      repositoryPath: effectiveRepoPath,
      branch: '',
      lifecycle: initialLifecycle,
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
      specPath: '',
      repositoryId: repository.id,
      ...(input.parentId ? { parentId: input.parentId } : {}),
      createdAt: now,
      updatedAt: now,
    };

    await this.featureRepo.create(feature);

    // Create agent run record (pending state — agent not spawned yet)
    const settings = getSettings();
    const agentRun = {
      id: runId,
      agentType: settings.agent.type,
      agentName: 'feature-agent',
      status: AgentRunStatus.pending,
      prompt: input.userInput,
      threadId: randomUUID(),
      featureId: feature.id,
      repositoryPath: effectiveRepoPath,
      ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.runRepository.create(agentRun);

    return { feature, shouldSpawn };
  }

  /**
   * Phase 2 (slow): AI metadata generation, git worktree, spec init, agent spawn.
   * Updates the feature record with refined metadata, branch, and specPath.
   */
  async initializeAndSpawn(
    feature: Feature,
    input: CreateFeatureInput,
    shouldSpawn: boolean
  ): Promise<{ warning?: string; updatedFeature: Feature }> {
    const effectiveRepoPath = feature.repositoryPath;

    // Ensure the target directory is a git repository (auto-init if needed)
    await this.worktreeService.ensureGitRepository(effectiveRepoPath);

    const metadata = await this.metadataGenerator.generateMetadata(input.userInput);
    const originalSlug = metadata.slug;

    const { slug, branch, warning } = await this.slugResolver.resolveUniqueSlug(
      originalSlug,
      effectiveRepoPath
    );

    // Determine next feature number for this repo
    const existingFeatures = await this.featureRepo.list({
      repositoryPath: effectiveRepoPath,
    });
    const featureNumber = existingFeatures.length;

    // Create git worktree branching from the repo's default branch
    const defaultBranch = await this.gitPrService.getDefaultBranch(effectiveRepoPath);
    const worktreePath = this.worktreeService.getWorktreePath(effectiveRepoPath, branch);
    await this.worktreeService.create(effectiveRepoPath, branch, worktreePath, defaultBranch);

    // Initialize spec directory — full user input goes into spec.yaml as-is
    const { specDir } = await this.specInitializer.initialize(
      worktreePath,
      slug,
      featureNumber,
      input.userInput,
      input.fast ? 'fast' : undefined
    );

    // Update feature record with refined metadata, branch, and specPath
    const updatedFeature: Feature = {
      ...feature,
      name: metadata.name,
      slug,
      description: metadata.description,
      branch,
      specPath: specDir,
      updatedAt: new Date(),
    };
    await this.featureRepo.update(updatedFeature);

    // Spawn agent if not blocked
    if (shouldSpawn) {
      const agentRun = await this.runRepository.findById(feature.agentRunId!);
      this.agentProcess.spawn(
        feature.id,
        feature.agentRunId!,
        effectiveRepoPath,
        specDir,
        worktreePath,
        {
          ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
          threadId: agentRun?.threadId ?? randomUUID(),
          push: input.push ?? false,
          openPr: input.openPr ?? false,
          ...(input.fast ? { fast: true } : {}),
          ...(input.model ? { model: input.model } : {}),
        }
      );
    }

    return { warning, updatedFeature };
  }
}

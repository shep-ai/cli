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
    private readonly repositoryRepo: IRepositoryRepository,
    @inject('IGitPrService')
    private readonly gitPrService: IGitPrService
  ) {}

  async execute(input: CreateFeatureInput): Promise<CreateFeatureResult> {
    // Resolve parent feature and determine child initial lifecycle (FR-8, FR-9, FR-12, FR-19)
    let initialLifecycle: SdlcLifecycle = SdlcLifecycle.Requirements;
    let shouldSpawn = true;
    // When creating a child feature, always use the parent's repositoryPath (the
    // original repo root), not the caller's cwd which may be a worktree (FR-10).
    let effectiveRepoPath = input.repositoryPath;

    if (input.parentId) {
      const parent = await this.featureRepo.findById(input.parentId);
      if (!parent) {
        throw new Error(`Parent feature not found: ${input.parentId}`);
      }

      // Use the parent's repositoryPath so the child worktree branches from the
      // original repo, not from inside another worktree.
      effectiveRepoPath = parent.repositoryPath;

      // Cycle detection — O(depth) upward walk through ancestor chain (FR-19)
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

      // Two-gate lifecycle logic (FR-9):
      //   parent.lifecycle === Blocked → cascade block (FR-12)
      //   parent.lifecycle not in POST_IMPLEMENTATION → early gate not met → Blocked
      //   parent.lifecycle in POST_IMPLEMENTATION → gate satisfied → Started
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

    // Ensure the target directory is a git repository (auto-init if needed)
    // Must run before slug resolution which needs git commands
    await this.worktreeService.ensureGitRepository(effectiveRepoPath);

    const metadata = await this.metadataGenerator.generateMetadata(input.userInput);
    const originalSlug = metadata.slug;

    // Find a unique slug — the branch may exist from a previous (deleted) feature
    const { slug, branch, warning } = await this.slugResolver.resolveUniqueSlug(
      originalSlug,
      effectiveRepoPath
    );

    // Determine next feature number for this repo
    const existingFeatures = await this.featureRepo.list({
      repositoryPath: effectiveRepoPath,
    });
    const featureNumber = existingFeatures.length + 1;

    const now = new Date();
    const runId = randomUUID();

    // Create git worktree branching from the repo's default branch
    const defaultBranch = await this.gitPrService.getDefaultBranch(effectiveRepoPath);
    const worktreePath = this.worktreeService.getWorktreePath(effectiveRepoPath, branch);
    await this.worktreeService.create(effectiveRepoPath, branch, worktreePath, defaultBranch);

    // Initialize spec directory — full user input goes into spec.yaml as-is
    const { specDir } = await this.specInitializer.initialize(
      worktreePath,
      slug,
      featureNumber,
      input.userInput
    );

    // Resolve or create repository entity for this path
    const normalizedPath = effectiveRepoPath.replace(/\/+$/, '') || effectiveRepoPath;
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
      repository = await this.repositoryRepo.create(repository);
      if (!repository) {
        throw new Error(
          `Failed to create or retrieve repository record for path: ${normalizedPath}`
        );
      }
    }

    const feature: Feature = {
      id: randomUUID(),
      name: metadata.name,
      slug,
      description: metadata.description,
      userQuery: input.userInput,
      repositoryPath: effectiveRepoPath,
      branch,
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
      specPath: specDir,
      repositoryId: repository.id,
      ...(input.parentId ? { parentId: input.parentId } : {}),
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
      repositoryPath: effectiveRepoPath,
      ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await this.runRepository.create(agentRun);

    // Only spawn the agent immediately if the child is not blocked (FR-9, FR-16)
    if (shouldSpawn) {
      this.agentProcess.spawn(feature.id, runId, effectiveRepoPath, specDir, worktreePath, {
        ...(input.approvalGates ? { approvalGates: input.approvalGates } : {}),
        threadId: agentRun.threadId,
        push: input.push ?? false,
        openPr: input.openPr ?? false,
      });
    }

    return { feature, warning };
  }
}

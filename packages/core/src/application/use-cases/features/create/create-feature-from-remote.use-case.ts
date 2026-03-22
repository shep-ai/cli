/**
 * Create Feature From Remote Use Case
 *
 * Composite use case that orchestrates importing a GitHub repository via
 * ImportGitHubRepositoryUseCase and then creating a feature via
 * CreateFeatureUseCase. Provides both a single execute() method (for CLI)
 * and two-phase createRecord() + initializeAndSpawn() (for Web UI).
 */

import { injectable, inject } from 'tsyringe';
import type { Feature } from '../../../../domain/generated/output.js';
import type {
  CloneOptions,
  ForkOptions,
} from '../../../ports/output/services/github-repository-service.interface.js';
import type { ApprovalGates, Attachment } from '../../../../domain/generated/output.js';
import { ImportGitHubRepositoryUseCase } from '../../repositories/import-github-repository.use-case.js';
import { CreateFeatureUseCase } from './create-feature.use-case.js';
import type { CreateFeatureInput, CreateFeatureResult, CreateRecordResult } from './types.js';

export interface CreateFeatureFromRemoteInput {
  /** GitHub URL or shorthand (e.g. "owner/repo", HTTPS, SSH) */
  remoteUrl: string;
  /** Override clone destination directory */
  cloneDest?: string;
  /** Default base directory for clones (from settings) */
  defaultCloneDir?: string;
  /** Options for the clone subprocess (e.g. progress callback) */
  cloneOptions?: CloneOptions;
  /** Options for the fork subprocess (e.g. progress callback) */
  forkOptions?: ForkOptions;

  /** Description of the feature to create */
  userInput: string;
  /** Approval gate settings */
  approvalGates?: ApprovalGates;
  /** Push branch to remote after creation */
  push?: boolean;
  /** Open a PR after creation */
  openPr?: boolean;
  /** Optional ID of the parent feature */
  parentId?: string;
  /** Pre-supplied name (skips AI metadata extraction for name) */
  name?: string;
  /** Pre-supplied description (skips AI metadata extraction for description) */
  description?: string;
  /** When true, skip SDLC phases and implement directly */
  fast?: boolean;
  /** When true, create feature in Pending state */
  pending?: boolean;
  /** Optional agent type override */
  agentType?: string;
  /** Optional model identifier forwarded to the agent executor */
  model?: string;
  /** Attachment records to persist with the feature */
  attachments?: Attachment[];
  /** Session ID for committing pending uploads (web UI flow) */
  sessionId?: string;
  /** Absolute file paths to attach (CLI --attach flow) */
  attachmentPaths?: string[];
}

@injectable()
export class CreateFeatureFromRemoteUseCase {
  constructor(
    @inject(ImportGitHubRepositoryUseCase)
    private readonly importGitHubRepo: ImportGitHubRepositoryUseCase,
    @inject(CreateFeatureUseCase)
    private readonly createFeature: CreateFeatureUseCase
  ) {}

  /**
   * Full execution: imports the repository (or finds existing), then creates
   * the feature with all SDLC initialization. Used by the CLI.
   */
  async execute(input: CreateFeatureFromRemoteInput): Promise<CreateFeatureResult> {
    const repository = await this.importGitHubRepo.execute({
      url: input.remoteUrl,
      dest: input.cloneDest,
      defaultCloneDir: input.defaultCloneDir,
      cloneOptions: input.cloneOptions,
      forkOptions: input.forkOptions,
    });

    return this.createFeature.execute(this.toCreateFeatureInput(input, repository.path));
  }

  /**
   * Phase 1 (fast): Imports the repository, then creates the feature + agent
   * run records in DB. Returns immediately with a real feature ID.
   * Used by the Web UI for optimistic rendering.
   */
  async createRecord(input: CreateFeatureFromRemoteInput): Promise<CreateRecordResult> {
    const repository = await this.importGitHubRepo.execute({
      url: input.remoteUrl,
      dest: input.cloneDest,
      defaultCloneDir: input.defaultCloneDir,
      cloneOptions: input.cloneOptions,
      forkOptions: input.forkOptions,
    });

    return this.createFeature.createRecord(this.toCreateFeatureInput(input, repository.path));
  }

  /**
   * Phase 2 (slow): AI metadata generation, git worktree, spec init, agent spawn.
   * Delegates directly to CreateFeatureUseCase since import is already complete.
   */
  async initializeAndSpawn(
    feature: Feature,
    input: CreateFeatureFromRemoteInput,
    shouldSpawn: boolean
  ): Promise<{ warning?: string; updatedFeature: Feature }> {
    return this.createFeature.initializeAndSpawn(
      feature,
      this.toCreateFeatureInput(input, feature.repositoryPath),
      shouldSpawn
    );
  }

  /**
   * Maps CreateFeatureFromRemoteInput to CreateFeatureInput by injecting
   * the repositoryPath derived from the import result.
   */
  private toCreateFeatureInput(
    input: CreateFeatureFromRemoteInput,
    repositoryPath: string
  ): CreateFeatureInput {
    return {
      userInput: input.userInput,
      repositoryPath,
      approvalGates: input.approvalGates,
      push: input.push,
      openPr: input.openPr,
      parentId: input.parentId,
      name: input.name,
      description: input.description,
      fast: input.fast,
      pending: input.pending,
      agentType: input.agentType,
      model: input.model,
      attachments: input.attachments,
      sessionId: input.sessionId,
      attachmentPaths: input.attachmentPaths,
    };
  }
}

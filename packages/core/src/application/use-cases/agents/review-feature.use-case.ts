/**
 * Review Feature Use Case
 *
 * Reads spec.yaml open questions for a feature waiting for approval,
 * returning structured data for the TUI review wizard.
 */

import { injectable, inject } from 'tsyringe';
import yaml from 'js-yaml';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';
import type { QuestionOption } from '../../../domain/generated/output.js';

export interface OpenQuestion {
  question: string;
  options: QuestionOption[];
  selectedOption: string;
  selectionRationale?: string;
  answer?: string;
}

export interface ReviewFeatureResult {
  success: true;
  questions: OpenQuestion[];
  featureName: string;
  phase: string;
  runId: string;
  repoPath: string;
}

export interface ReviewFeatureError {
  success: false;
  reason: string;
}

@injectable()
export class ReviewFeatureUseCase {
  constructor(
    @inject('IFeatureRepository') private readonly featureRepository: IFeatureRepository,
    @inject('IAgentRunRepository') private readonly agentRunRepository: IAgentRunRepository
  ) {}

  async execute(
    featureId: string,
    repoPath: string
  ): Promise<ReviewFeatureResult | ReviewFeatureError> {
    // Find feature (try exact match, then prefix)
    const feature =
      (await this.featureRepository.findById(featureId)) ??
      (await this.featureRepository.findByIdPrefix(featureId));
    if (!feature) return { success: false, reason: 'Feature not found' };

    // Find agent run
    if (!feature.agentRunId) return { success: false, reason: 'Feature has no agent run' };
    const run = await this.agentRunRepository.findById(feature.agentRunId);
    if (!run || run.status !== AgentRunStatus.waitingApproval) {
      return {
        success: false,
        reason: `Feature is not waiting for approval (status: ${run?.status ?? 'unknown'})`,
      };
    }

    // Read spec.yaml using feature's stored specPath
    if (!feature.specPath) {
      return { success: false, reason: 'Feature has no spec path' };
    }
    const specPath = join(feature.specPath, 'spec.yaml');
    let specContent: string;
    try {
      specContent = readFileSync(specPath, 'utf-8');
    } catch {
      return { success: false, reason: 'Could not read spec.yaml' };
    }

    // Parse openQuestions
    const spec = yaml.load(specContent) as Record<string, unknown>;
    const openQuestions = spec?.openQuestions;
    if (!Array.isArray(openQuestions) || openQuestions.length === 0) {
      return { success: false, reason: 'No open questions found in spec.yaml' };
    }

    const questions: OpenQuestion[] = openQuestions.map((q: Record<string, unknown>) => ({
      question: String(q.question ?? ''),
      options: Array.isArray(q.options) ? q.options : [],
      selectedOption: String(q.answer ?? ''),
      selectionRationale: q.selectionRationale ? String(q.selectionRationale) : undefined,
      answer: q.answer ? String(q.answer) : undefined,
    }));

    return {
      success: true,
      questions,
      featureName: feature.name,
      phase: 'requirements',
      runId: run.id,
      repoPath: run.repositoryPath ?? repoPath,
    };
  }
}

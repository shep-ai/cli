/**
 * Enforce Security Use Case
 *
 * Orchestrates the full security enforcement flow:
 * 1. Evaluate effective policy
 * 2. Run dependency-risk checks
 * 3. Run release-integrity checks
 * 4. Persist findings as security events
 * 5. Return structured enforcement result
 *
 * Supports Advisory (always pass) and Enforce (fail on violations) modes.
 * Disabled mode returns empty pass result.
 */

import { injectable, inject } from 'tsyringe';
import { SecurityMode, SecurityActionCategory } from '../../../domain/generated/output.js';
import type {
  EffectivePolicySnapshot,
  DependencyFinding,
  ReleaseIntegrityResult,
  SecurityEvent,
  DependencyRules,
  ReleaseRules,
} from '../../../domain/generated/output.js';
import type { ISecurityPolicyService } from '../../ports/output/services/security-policy-service.interface.js';
import type { ISecurityEventRepository } from '../../ports/output/repositories/security-event.repository.interface.js';
import type { ISettingsRepository } from '../../ports/output/repositories/settings.repository.interface.js';
import { DependencyRiskEvaluator } from '../../../infrastructure/services/security/dependency-risk-evaluator.js';
import { ReleaseIntegrityEvaluator } from '../../../infrastructure/services/security/release-integrity-evaluator.js';
import { randomUUID } from 'node:crypto';

/**
 * Input for the enforce security use case.
 */
export interface EnforceSecurityInput {
  /** Absolute path to the repository to evaluate */
  repositoryPath: string;
}

/**
 * Result of the enforcement flow.
 */
export interface EnforceSecurityResult {
  /** Whether all checks passed (Advisory always passes, Enforce fails on violations) */
  passed: boolean;
  /** Effective security mode used for evaluation */
  mode: SecurityMode;
  /** Effective policy snapshot */
  policy: EffectivePolicySnapshot;
  /** Dependency risk findings */
  dependencyFindings: DependencyFinding[];
  /** Release integrity result */
  releaseIntegrity: ReleaseIntegrityResult;
  /** Total number of findings */
  totalFindings: number;
}

/**
 * Default dependency rules when no policy file defines them.
 */
const DEFAULT_DEPENDENCY_RULES: DependencyRules = {
  checkLockfileConsistency: true,
  checkLifecycleScripts: true,
  checkNonRegistrySource: true,
  enforceStrictVersionRanges: false,
  allowlist: [],
  denylist: [],
};

/**
 * Default release rules when no policy file defines them.
 */
const DEFAULT_RELEASE_RULES: ReleaseRules = {
  requireCiOnlyPublishing: true,
  requireProvenance: true,
  checkWorkflowIntegrity: true,
};

@injectable()
export class EnforceSecurityUseCase {
  constructor(
    @inject('ISecurityPolicyService')
    private readonly policyService: ISecurityPolicyService,
    @inject('ISecurityEventRepository')
    private readonly eventRepository: ISecurityEventRepository,
    @inject('ISettingsRepository')
    private readonly settingsRepository: ISettingsRepository,
    @inject('DependencyRiskEvaluator')
    private readonly dependencyEvaluator: DependencyRiskEvaluator,
    @inject('ReleaseIntegrityEvaluator')
    private readonly releaseEvaluator: ReleaseIntegrityEvaluator
  ) {}

  async execute(input: EnforceSecurityInput): Promise<EnforceSecurityResult> {
    // Evaluate effective policy
    const policy = await this.policyService.evaluatePolicy(input.repositoryPath);

    // Disabled mode — return empty pass result
    if (policy.mode === SecurityMode.Disabled) {
      return {
        passed: true,
        mode: SecurityMode.Disabled,
        policy,
        dependencyFindings: [],
        releaseIntegrity: { checks: [], passed: true },
        totalFindings: 0,
      };
    }

    // Run dependency-risk checks
    const dependencyFindings = this.dependencyEvaluator.evaluate(
      input.repositoryPath,
      DEFAULT_DEPENDENCY_RULES
    );

    // Run release-integrity checks
    const releaseIntegrity = this.releaseEvaluator.evaluate(
      input.repositoryPath,
      DEFAULT_RELEASE_RULES
    );

    // Count total findings
    const failedReleaseChecks = releaseIntegrity.checks.filter((c) => !c.passed);
    const totalFindings = dependencyFindings.length + failedReleaseChecks.length;

    // Persist findings as security events
    await this.persistFindings(input.repositoryPath, dependencyFindings, releaseIntegrity);

    // Update settings with evaluation timestamp
    await this.updateEvaluationTimestamp(policy.source);

    // Determine pass/fail based on mode
    const hasFailures = totalFindings > 0;
    const passed = policy.mode === SecurityMode.Advisory ? true : !hasFailures;

    return {
      passed,
      mode: policy.mode,
      policy,
      dependencyFindings,
      releaseIntegrity,
      totalFindings,
    };
  }

  /**
   * Persist dependency findings and failed release checks as security events.
   */
  private async persistFindings(
    repositoryPath: string,
    depFindings: DependencyFinding[],
    releaseResult: ReleaseIntegrityResult
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const finding of depFindings) {
      const event: SecurityEvent = {
        id: randomUUID(),
        repositoryPath,
        severity: finding.severity,
        category: SecurityActionCategory.DependencyInstall,
        disposition: 'Denied' as SecurityEvent['disposition'],
        message: finding.message,
        remediationSummary: finding.remediation,
        createdAt: now,
        updatedAt: now,
      };
      await this.eventRepository.save(event);
    }

    for (const check of releaseResult.checks) {
      if (!check.passed) {
        const event: SecurityEvent = {
          id: randomUUID(),
          repositoryPath,
          severity: check.severity,
          category: SecurityActionCategory.PublishRelease,
          disposition: 'Denied' as SecurityEvent['disposition'],
          message: check.message,
          createdAt: now,
          updatedAt: now,
        };
        await this.eventRepository.save(event);
      }
    }
  }

  /**
   * Update settings with the latest evaluation timestamp and policy source.
   */
  private async updateEvaluationTimestamp(policySource: string): Promise<void> {
    try {
      const settings = await this.settingsRepository.load();
      if (settings) {
        settings.security = {
          ...settings.security,
          mode: settings.security?.mode ?? SecurityMode.Advisory,
          lastEvaluationAt: new Date().toISOString(),
          policySource,
        };
        await this.settingsRepository.update(settings);
      }
    } catch {
      // Non-fatal — evaluation results are still returned even if settings update fails
    }
  }
}

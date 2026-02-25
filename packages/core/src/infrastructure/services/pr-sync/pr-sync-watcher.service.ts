/**
 * PR Sync Watcher Service
 *
 * Polls GitHub PR status and CI status for features in the Review lifecycle
 * stage, updating feature records and emitting notifications when transitions
 * are detected. Follows the NotificationWatcherService polling pattern.
 *
 * Maintains in-memory tracking of last-known PR and CI status per feature
 * to avoid duplicate updates and notifications. Features are grouped by
 * repositoryPath for batch `gh pr list` queries.
 */

import type { Feature, NotificationEvent } from '../../../domain/generated/output.js';
import {
  SdlcLifecycle,
  PrStatus,
  CiStatus,
  AgentRunStatus,
  NotificationEventType,
  NotificationSeverity,
} from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../../application/ports/output/agents/agent-run-repository.interface.js';
import type { IGitPrService } from '../../../application/ports/output/services/git-pr-service.interface.js';
import type {
  CiStatusResult,
  PrStatusInfo,
} from '../../../application/ports/output/services/git-pr-service.interface.js';
import type { INotificationService } from '../../../application/ports/output/services/notification-service.interface.js';

const DEFAULT_POLL_INTERVAL_MS = 3000;

interface PrWatcherState {
  prStatus: PrStatus;
  ciStatus: CiStatus | undefined;
  featureName: string;
}

const CI_STATUS_MAP: Record<string, CiStatus> = {
  success: CiStatus.Success,
  failure: CiStatus.Failure,
  pending: CiStatus.Pending,
};

export class PrSyncWatcherService {
  private readonly featureRepo: IFeatureRepository;
  private readonly agentRunRepo: IAgentRunRepository;
  private readonly gitPrService: IGitPrService;
  private readonly notificationService: INotificationService;
  private readonly pollIntervalMs: number;
  private readonly trackedFeatures = new Map<string, PrWatcherState>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    featureRepo: IFeatureRepository,
    agentRunRepo: IAgentRunRepository,
    gitPrService: IGitPrService,
    notificationService: INotificationService,
    pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ) {
    this.featureRepo = featureRepo;
    this.agentRunRepo = agentRunRepo;
    this.gitPrService = gitPrService;
    this.notificationService = notificationService;
    this.pollIntervalMs = pollIntervalMs;
  }

  isRunning(): boolean {
    return this.intervalId !== null;
  }

  start(): void {
    if (this.intervalId !== null) return;

    // Run first poll immediately
    void this.poll();

    this.intervalId = setInterval(() => {
      void this.poll();
    }, this.pollIntervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private async poll(): Promise<void> {
    try {
      const allFeatures = await this.featureRepo.list({ lifecycle: SdlcLifecycle.Review });

      // Include features with a valid repositoryPath (with or without PR data)
      const features = allFeatures.filter((f) => f.repositoryPath);

      if (features.length === 0) {
        // Prune all tracked features since none are in Review
        this.trackedFeatures.clear();
        return;
      }

      // Group features by repositoryPath for batch queries
      const byRepo = new Map<string, Feature[]>();
      for (const feature of features) {
        const group = byRepo.get(feature.repositoryPath) ?? [];
        group.push(feature);
        byRepo.set(feature.repositoryPath, group);
      }

      // Process each repository
      for (const [repoPath, repoFeatures] of byRepo) {
        await this.processRepository(repoPath, repoFeatures);
      }

      // Prune features no longer in Review
      const currentFeatureIds = new Set(features.map((f) => f.id));
      for (const trackedId of this.trackedFeatures.keys()) {
        if (!currentFeatureIds.has(trackedId)) {
          this.trackedFeatures.delete(trackedId);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('PrSyncWatcherService poll failed:', error);
    }
  }

  private async processRepository(repoPath: string, features: Feature[]): Promise<void> {
    let prStatuses: PrStatusInfo[];
    try {
      prStatuses = await this.gitPrService.listPrStatuses(repoPath);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`PrSyncWatcherService: listPrStatuses failed for ${repoPath}:`, error);
      return;
    }

    // Build lookups by PR number and by head branch name
    const statusByNumber = new Map<number, PrStatusInfo>();
    const statusByBranch = new Map<string, PrStatusInfo>();
    for (const pr of prStatuses) {
      statusByNumber.set(pr.number, pr);
      if (pr.headRefName) {
        statusByBranch.set(pr.headRefName, pr);
      }
    }

    for (const feature of features) {
      await this.processFeature(feature, statusByNumber, statusByBranch);
    }
  }

  private async processFeature(
    feature: Feature,
    statusByNumber: Map<number, PrStatusInfo>,
    statusByBranch: Map<string, PrStatusInfo>
  ): Promise<void> {
    // If feature has no PR data, try to discover a PR by matching branch name
    if (!feature.pr) {
      const matchedPr = statusByBranch.get(feature.branch);
      if (!matchedPr) return; // No matching PR found on GitHub

      // Populate the feature's PR data from the discovered GitHub PR
      feature.pr = {
        url: matchedPr.url,
        number: matchedPr.number,
        status: matchedPr.state,
      };

      // Initialize tracking with the discovered state
      this.trackedFeatures.set(feature.id, {
        prStatus: matchedPr.state,
        ciStatus: undefined,
        featureName: feature.name,
      });

      // If already merged, transition immediately
      if (matchedPr.state === PrStatus.Merged) {
        feature.lifecycle = SdlcLifecycle.Maintain;
        await this.completeAgentRun(feature);
        this.emitNotification(
          NotificationEventType.PrMerged,
          feature.id,
          feature.agentRunId ?? '',
          feature.name,
          `PR #${matchedPr.number} merged for ${feature.name}`,
          NotificationSeverity.Success
        );
      }

      await this.featureRepo.update(feature);
      return;
    }

    const pr = feature.pr;
    const prStatusInfo = statusByNumber.get(pr.number);

    let needsUpdate = false;

    // Initialize or retrieve tracked state
    const prevState = this.trackedFeatures.get(feature.id);
    if (!prevState) {
      // First time seeing this feature — initialize tracking
      this.trackedFeatures.set(feature.id, {
        prStatus: pr.status,
        ciStatus: pr.ciStatus,
        featureName: feature.name,
      });
    }

    const tracked = this.trackedFeatures.get(feature.id)!;

    // Check PR status transition
    if (prStatusInfo && prStatusInfo.state !== tracked.prStatus) {
      const newPrStatus = prStatusInfo.state;

      feature.pr = { ...pr, status: newPrStatus };

      if (newPrStatus === PrStatus.Merged) {
        feature.lifecycle = SdlcLifecycle.Maintain;
        await this.completeAgentRun(feature);

        this.emitNotification(
          NotificationEventType.PrMerged,
          feature.id,
          feature.agentRunId ?? '',
          feature.name,
          `PR #${pr.number} merged for ${feature.name}`,
          NotificationSeverity.Success
        );
      } else if (newPrStatus === PrStatus.Closed) {
        this.emitNotification(
          NotificationEventType.PrClosed,
          feature.id,
          feature.agentRunId ?? '',
          feature.name,
          `PR #${pr.number} closed for ${feature.name}`,
          NotificationSeverity.Warning
        );
      }

      tracked.prStatus = newPrStatus;
      needsUpdate = true;
    }

    // Check CI status transition
    try {
      const ciResult: CiStatusResult = await this.gitPrService.getCiStatus(
        feature.repositoryPath,
        feature.branch
      );
      const newCiStatus = CI_STATUS_MAP[ciResult.status] ?? CiStatus.Pending;

      if (newCiStatus !== tracked.ciStatus) {
        feature.pr = { ...(feature.pr ?? pr), ciStatus: newCiStatus };

        if (newCiStatus === CiStatus.Success) {
          this.emitNotification(
            NotificationEventType.PrChecksPassed,
            feature.id,
            feature.agentRunId ?? '',
            feature.name,
            `CI checks passed for ${feature.name}`,
            NotificationSeverity.Success
          );
        } else if (newCiStatus === CiStatus.Failure) {
          this.emitNotification(
            NotificationEventType.PrChecksFailed,
            feature.id,
            feature.agentRunId ?? '',
            feature.name,
            `CI checks failed for ${feature.name}`,
            NotificationSeverity.Error
          );
        }

        tracked.ciStatus = newCiStatus;
        needsUpdate = true;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`PrSyncWatcherService: getCiStatus failed for feature ${feature.id}:`, error);
    }

    if (needsUpdate) {
      await this.featureRepo.update(feature);
    }
  }

  /** Mark associated agent run as completed so the UI reflects "done" state. */
  private async completeAgentRun(feature: Feature): Promise<void> {
    if (!feature.agentRunId) return;
    try {
      await this.agentRunRepo.updateStatus(feature.agentRunId, AgentRunStatus.completed);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(
        `PrSyncWatcherService: failed to update agent run ${feature.agentRunId}:`,
        error
      );
    }
  }

  private emitNotification(
    eventType: NotificationEventType,
    featureId: string,
    agentRunId: string,
    featureName: string,
    message: string,
    severity: NotificationSeverity
  ): void {
    const event: NotificationEvent = {
      eventType,
      featureId,
      agentRunId,
      featureName,
      message,
      severity,
      timestamp: new Date().toISOString(),
    };

    this.notificationService.notify(event);
  }
}

// --- Singleton accessors (follows NotificationWatcherService pattern) ---

let watcherInstance: PrSyncWatcherService | null = null;

/**
 * Initialize the PR sync watcher singleton.
 * Must be called once during web server startup.
 *
 * @throws Error if the watcher is already initialized
 */
export function initializePrSyncWatcher(
  featureRepo: IFeatureRepository,
  agentRunRepo: IAgentRunRepository,
  gitPrService: IGitPrService,
  notificationService: INotificationService,
  pollIntervalMs?: number
): void {
  if (watcherInstance !== null) {
    throw new Error('PR sync watcher already initialized. Cannot re-initialize.');
  }

  watcherInstance = new PrSyncWatcherService(
    featureRepo,
    agentRunRepo,
    gitPrService,
    notificationService,
    pollIntervalMs
  );
}

/**
 * Get the PR sync watcher singleton.
 *
 * @returns The PR sync watcher service
 * @throws Error if the watcher hasn't been initialized yet
 */
export function getPrSyncWatcher(): PrSyncWatcherService {
  if (watcherInstance === null) {
    throw new Error(
      'PR sync watcher not initialized. Call initializePrSyncWatcher() during web server startup.'
    );
  }

  return watcherInstance;
}

/**
 * Check if the PR sync watcher has been initialized.
 */
export function hasPrSyncWatcher(): boolean {
  return watcherInstance !== null;
}

/**
 * Reset the PR sync watcher singleton (for testing purposes only).
 * Stops the watcher if running before resetting.
 *
 * @internal
 */
export function resetPrSyncWatcher(): void {
  if (watcherInstance !== null) {
    watcherInstance.stop();
  }
  watcherInstance = null;
}

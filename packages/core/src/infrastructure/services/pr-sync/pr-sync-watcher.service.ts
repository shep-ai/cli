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
  NotificationEventType,
  NotificationSeverity,
} from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../../application/ports/output/repositories/feature-repository.interface.js';
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
  private readonly gitPrService: IGitPrService;
  private readonly notificationService: INotificationService;
  private readonly pollIntervalMs: number;
  private readonly trackedFeatures = new Map<string, PrWatcherState>();
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    featureRepo: IFeatureRepository,
    gitPrService: IGitPrService,
    notificationService: INotificationService,
    pollIntervalMs: number = DEFAULT_POLL_INTERVAL_MS
  ) {
    this.featureRepo = featureRepo;
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

      // Filter to features with a PR and a valid repositoryPath
      const features = allFeatures.filter((f) => f.pr && f.repositoryPath);

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

    // Build lookup by PR number
    const statusByNumber = new Map<number, PrStatusInfo>();
    for (const pr of prStatuses) {
      statusByNumber.set(pr.number, pr);
    }

    for (const feature of features) {
      await this.processFeature(feature, statusByNumber);
    }
  }

  private async processFeature(
    feature: Feature,
    statusByNumber: Map<number, PrStatusInfo>
  ): Promise<void> {
    const pr = feature.pr!;
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
        this.emitNotification(
          NotificationEventType.PrMerged,
          feature.name,
          `PR #${pr.number} merged for ${feature.name}`,
          NotificationSeverity.Success
        );
      } else if (newPrStatus === PrStatus.Closed) {
        this.emitNotification(
          NotificationEventType.PrClosed,
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
            feature.name,
            `CI checks passed for ${feature.name}`,
            NotificationSeverity.Success
          );
        } else if (newCiStatus === CiStatus.Failure) {
          this.emitNotification(
            NotificationEventType.PrChecksFailed,
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

  private emitNotification(
    eventType: NotificationEventType,
    featureName: string,
    message: string,
    severity: NotificationSeverity
  ): void {
    const event: NotificationEvent = {
      eventType,
      featureId: '',
      agentRunId: '',
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
  gitPrService: IGitPrService,
  notificationService: INotificationService,
  pollIntervalMs?: number
): void {
  if (watcherInstance !== null) {
    throw new Error('PR sync watcher already initialized. Cannot re-initialize.');
  }

  watcherInstance = new PrSyncWatcherService(
    featureRepo,
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

/**
 * @module Shep.Domain.Entities.NotificationEvent
 *
 * Defines the NotificationEvent model representing a notification emitted
 * when an agent transitions through lifecycle states. This is a value object
 * (no BaseEntity inheritance) since notification events are ephemeral —
 * they are emitted, delivered to active channels, and not persisted.
 *
 * ## Event Flow
 *
 * ```
 * NotificationWatcherService (polls DB)
 *   → detects status transition
 *   → creates NotificationEvent
 *   → emits to NotificationEventBus
 *   → fans out to: SSE clients, desktop notifier
 * ```
 */
import "../../common/enums/notification.tsp";

@doc("Notification event emitted for agent lifecycle transitions")
model NotificationEvent {
  @doc("Type of lifecycle event")
  eventType: NotificationEventType;

  @doc("ID of the agent run that triggered this event")
  agentRunId: string;

  @doc("ID of the feature that triggered this event")
  featureId: string;

  @doc("Human-readable feature name")
  featureName: string;

  @doc("Phase name (only for phaseCompleted events)")
  phaseName?: string;

  @doc("Human-readable event description")
  message: string;

  @doc("Display severity for notification rendering")
  severity: NotificationSeverity;

  @doc("When the event occurred")
  timestamp: utcDateTime;
}

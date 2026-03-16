'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Clock, Zap, DollarSign } from 'lucide-react';
import type {
  PhaseTimingData,
  RejectionFeedbackData,
} from '@/app/actions/get-feature-phase-timings';
import { InlineAttachments } from '@/components/common/inline-attachments';
import { formatDuration } from '@/lib/format-duration';

/**
 * Computes the effective duration for a phase timing entry.
 * For completed phases, uses the server-provided durationMs.
 * For in-progress phases (has startedAt but no completedAt), computes
 * elapsed time client-side so the UI shows a live-updating timer.
 */
function getEffectiveDuration(timing: PhaseTimingData, now: number): number {
  if (timing.durationMs != null && timing.durationMs > 0) return timing.durationMs;
  if (!timing.completedAt && timing.startedAt) {
    const started = new Date(timing.startedAt).getTime();
    if (!Number.isNaN(started)) return Math.max(0, now - started);
  }
  return 0;
}

/** Returns true if any non-lifecycle phase is still in progress. */
function hasRunningPhase(timings: PhaseTimingData[]): boolean {
  return timings.some((t) => !t.phase.startsWith('run:') && !t.completedAt && t.startedAt);
}

/** Hook that ticks every second while there are running phases. */
function useTickingNow(timings: PhaseTimingData[] | null): number {
  const [now, setNow] = useState(Date.now);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const running = timings ? hasRunningPhase(timings) : false;
    if (running) {
      // Tick every second
      intervalRef.current = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timings]);

  return now;
}

/** Format a token count with K/M suffix for readability. */
function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

/** Format a USD cost with appropriate precision. */
function formatCost(usd: number): string {
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(4)}`;
}

export interface ActivityTabProps {
  timings: PhaseTimingData[] | null;
  loading: boolean;
  error: string | null;
  rejectionFeedback?: RejectionFeedbackData[];
}

const NODE_TO_PHASE: Record<string, string> = {
  analyze: 'Analyzing',
  requirements: 'Requirements',
  research: 'Researching',
  plan: 'Planning',
  implement: 'Implementing',
  merge: 'Merging',
};

const LIFECYCLE_EVENTS: Record<string, { label: string; colorClass: string }> = {
  'run:started': { label: 'started', colorClass: 'text-blue-600' },
  'run:resumed': { label: 'resumed', colorClass: 'text-blue-600' },
  'run:completed': { label: 'completed', colorClass: 'text-emerald-600' },
  'run:failed': { label: 'failed', colorClass: 'text-red-600' },
  'run:stopped': { label: 'stopped', colorClass: 'text-amber-600' },
  'run:crashed': { label: 'crashed', colorClass: 'text-red-600' },
  'run:rejected': { label: 'rejected', colorClass: 'text-orange-600' },
};

function isLifecycleEvent(phase: string): boolean {
  return phase.startsWith('run:');
}

/* ---------------------------------------------------------------------------
 * Lifecycle-aware view model
 * ------------------------------------------------------------------------- */

/**
 * A single iteration in the lifecycle timeline.
 *
 * An iteration represents one cycle of work:
 *   started/resumed → phase work → rejected/completed/failed
 *
 * Each rejected iteration has associated rejection feedback.
 */
export interface TimelineIteration {
  /** 1-based iteration number */
  number: number;
  /** The timing events in this iteration */
  timings: PhaseTimingData[];
  /** If this iteration ended with rejection, the feedback message */
  rejectionMessage?: string;
  /** If this iteration ended with rejection, any attachments */
  rejectionAttachments?: string[];
}

/**
 * Build a lifecycle-aware timeline from flat timing events and rejection feedback.
 *
 * Splits the timing stream at run:rejected boundaries to produce iterations.
 * Each rejection feedback entry is matched to its iteration by index.
 *
 * When there are more feedback entries than run:rejected events in the timings,
 * synthetic run:rejected + run:resumed events are appended to ensure every
 * feedback entry is represented.
 */
export function buildLifecycleTimeline(
  timings: PhaseTimingData[],
  feedback?: RejectionFeedbackData[]
): TimelineIteration[] {
  if (!timings.length) return [];

  // Count existing run:rejected events
  const existingRejectionCount = timings.filter((t) => t.phase === 'run:rejected').length;
  const feedbackCount = feedback?.length ?? 0;

  // Augment timings with synthetic rejection/resumed cycles for unmatched feedback
  let augmented = timings;
  if (feedbackCount > existingRejectionCount) {
    augmented = [...timings];

    // Use last timing's agentRunId as template
    const templateRunId = timings[timings.length - 1].agentRunId;

    for (let i = existingRejectionCount; i < feedbackCount; i++) {
      const fb = feedback![i];
      // Add run:resumed before work (except for the first synthetic, which continues from existing)
      if (i > existingRejectionCount) {
        augmented.push({
          agentRunId: templateRunId,
          phase: 'run:resumed',
          startedAt: fb.timestamp ?? `synthetic-resumed-${i}`,
        });
      }
      // Add run:rejected
      augmented.push({
        agentRunId: templateRunId,
        phase: 'run:rejected',
        startedAt: fb.timestamp ?? `synthetic-${i}`,
      });
    }
  }

  // Split into iterations at run:rejected boundaries
  const iterations: TimelineIteration[] = [];
  let currentEvents: PhaseTimingData[] = [];
  let rejectionIndex = 0;

  for (const t of augmented) {
    currentEvents.push(t);

    if (t.phase === 'run:rejected') {
      const fb = feedback?.[rejectionIndex];
      iterations.push({
        number: iterations.length + 1,
        timings: currentEvents,
        rejectionMessage: fb?.message,
        rejectionAttachments: fb?.attachments,
      });
      currentEvents = [];
      rejectionIndex++;
    }
  }

  // Remaining events after last rejection (or all events if no rejections)
  if (currentEvents.length > 0) {
    iterations.push({
      number: iterations.length + 1,
      timings: currentEvents,
    });
  }

  return iterations;
}

/* ---------------------------------------------------------------------------
 * Component
 * ------------------------------------------------------------------------- */

export function ActivityTab({ timings, loading, error, rejectionFeedback }: ActivityTabProps) {
  const now = useTickingNow(timings);

  if (loading) {
    return (
      <div data-testid="activity-tab-loading" className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!timings || timings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <Clock className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No activity recorded yet</p>
      </div>
    );
  }

  const nodeTimings = timings.filter((t) => !isLifecycleEvent(t.phase));
  const maxDurationMs = Math.max(
    ...nodeTimings.map((t) => getEffectiveDuration(t, now)),
    ...nodeTimings.map((t) => t.approvalWaitMs ?? 0),
    0
  );

  const iterations = buildLifecycleTimeline(timings, rejectionFeedback);
  const hasMultipleIterations = iterations.length > 1;

  const totalExecMs = nodeTimings.reduce((sum, t) => sum + getEffectiveDuration(t, now), 0);
  const totalWaitMs = nodeTimings.reduce((sum, t) => sum + (t.approvalWaitMs ?? 0), 0);
  const totalInputTokens = nodeTimings.reduce((sum, t) => sum + (t.inputTokens ?? 0), 0);
  const totalOutputTokens = nodeTimings.reduce((sum, t) => sum + (t.outputTokens ?? 0), 0);
  const totalCostUsd = nodeTimings.reduce((sum, t) => sum + (t.costUsd ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div data-testid="activity-timings" className="flex flex-col gap-3">
        {iterations.map((iteration) => (
          <IterationGroup
            key={iteration.number}
            iteration={iteration}
            showHeader={hasMultipleIterations}
            maxDurationMs={maxDurationMs}
            now={now}
          />
        ))}
      </div>
      {totalExecMs > 0 ? (
        <SummaryTotals
          totalExecMs={totalExecMs}
          totalWaitMs={totalWaitMs}
          totalInputTokens={totalInputTokens}
          totalOutputTokens={totalOutputTokens}
          totalCostUsd={totalCostUsd}
        />
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Iteration group — one cycle of work
 * ------------------------------------------------------------------------- */

function IterationGroup({
  iteration,
  showHeader,
  maxDurationMs,
  now,
}: {
  iteration: TimelineIteration;
  showHeader: boolean;
  maxDurationMs: number;
  now: number;
}) {
  return (
    <div data-testid={`iteration-${iteration.number}`} className="flex flex-col gap-1.5">
      {showHeader ? (
        <div className="text-muted-foreground text-xs font-medium">
          Iteration {iteration.number}
        </div>
      ) : null}
      {iteration.timings.map((t) => {
        if (isLifecycleEvent(t.phase)) {
          // For run:rejected, the message comes from the iteration, not a separate map
          const isRejection = t.phase === 'run:rejected';
          return (
            <LifecycleEventRow
              key={`${t.agentRunId}-${t.phase}-${t.startedAt}`}
              timing={t}
              message={isRejection ? iteration.rejectionMessage : undefined}
              attachments={isRejection ? iteration.rejectionAttachments : undefined}
            />
          );
        }
        return (
          <NodeTimingRow
            key={`${t.agentRunId}-${t.phase}-${t.startedAt}`}
            timing={t}
            maxDurationMs={maxDurationMs}
            now={now}
          />
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Row components
 * ------------------------------------------------------------------------- */

function LifecycleEventRow({
  timing,
  message,
  attachments,
}: {
  timing: PhaseTimingData;
  message?: string;
  attachments?: string[];
}) {
  const event = LIFECYCLE_EVENTS[timing.phase];
  if (!event) return null;

  const hasAttachments = attachments && attachments.length > 0;

  return (
    <div className={`text-xs ${event.colorClass}`}>
      <span>{event.label}</span>
      {message ? (
        <span
          data-testid="rejection-feedback-text"
          className="text-muted-foreground ml-2 font-normal italic"
        >
          &mdash; {message}
        </span>
      ) : null}
      {hasAttachments ? (
        <div data-testid="rejection-feedback-attachments" className="mt-1.5 ml-2">
          <InlineAttachments text="" attachmentPaths={attachments} />
        </div>
      ) : null}
    </div>
  );
}

function NodeTimingRow({
  timing,
  maxDurationMs,
  now,
}: {
  timing: PhaseTimingData;
  maxDurationMs: number;
  now: number;
}) {
  const suffix = timing.phase.includes(':') ? timing.phase.split(':')[1] : null;
  const isSubPhase = suffix !== null;
  // Distinguish implementation sub-phases (phase-1, phase-2) from rejection retries (2, 3)
  const isImplPhase = suffix?.startsWith('phase-') ?? false;
  const label = isImplPhase
    ? `Phase ${suffix!.replace('phase-', '')}`
    : suffix !== null
      ? `retry #${suffix}`
      : (NODE_TO_PHASE[timing.phase] ?? timing.phase);

  const durationMs = getEffectiveDuration(timing, now);
  const barPercent = maxDurationMs > 0 ? Math.max(2, (durationMs / maxDurationMs) * 100) : 2;
  const isRunning = !timing.completedAt && !!timing.startedAt;
  const barColorClass = timing.completedAt
    ? isImplPhase
      ? 'bg-emerald-400'
      : isSubPhase
        ? 'bg-amber-500'
        : 'bg-emerald-500'
    : 'bg-blue-500';
  const totalTokens =
    timing.inputTokens != null || timing.outputTokens != null
      ? (timing.inputTokens ?? 0) + (timing.outputTokens ?? 0)
      : null;

  return (
    <div className={isSubPhase ? 'flex flex-col gap-1 pl-6' : 'flex flex-col gap-1'}>
      <div data-testid={`timing-bar-${timing.phase}`} className="flex items-center gap-2">
        <span className={`text-muted-foreground shrink-0 text-xs ${isSubPhase ? 'w-18' : 'w-24'}`}>
          {label}
        </span>
        <div
          className={`bg-muted min-w-0 flex-1 overflow-hidden rounded-full ${isSubPhase ? 'h-2.5' : 'h-3'}`}
        >
          <div
            className={`h-full rounded-full ${barColorClass}${isRunning ? 'animate-pulse' : ''}`}
            style={{ width: `${Math.min(barPercent, 100)}%` }}
          />
        </div>
        <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
          {formatDuration(durationMs)}
        </span>
        <span className="text-muted-foreground w-12 shrink-0 text-right text-[10px] tabular-nums">
          {totalTokens != null && totalTokens > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <Zap className="h-2 w-2 opacity-50" />
              {formatTokens(totalTokens)}
            </span>
          ) : null}
        </span>
        <span className="text-muted-foreground w-14 shrink-0 text-right text-[10px] tabular-nums">
          {timing.costUsd != null && timing.costUsd > 0 ? (
            <span className="inline-flex items-center gap-0.5">
              <DollarSign className="h-2 w-2 opacity-50" />
              {formatCost(timing.costUsd)}
            </span>
          ) : null}
        </span>
      </div>
      {timing.approvalWaitMs != null && timing.approvalWaitMs > 0 ? (
        <ApprovalWaitRow timing={timing} maxDurationMs={maxDurationMs} />
      ) : null}
    </div>
  );
}

function ApprovalWaitRow({
  timing,
  maxDurationMs,
}: {
  timing: PhaseTimingData;
  maxDurationMs: number;
}) {
  const waitMs = timing.approvalWaitMs ?? 0;
  const barPercent = maxDurationMs > 0 ? Math.max(2, (waitMs / maxDurationMs) * 100) : 2;

  return (
    <div data-testid={`approval-wait-${timing.phase}`} className="flex items-center gap-2 pl-4">
      <span className="text-muted-foreground w-20 shrink-0 text-xs">approval</span>
      <div className="bg-muted h-2.5 min-w-0 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${Math.min(barPercent, 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
        {formatDuration(waitMs)}
      </span>
      {/* Spacers to align with token + cost columns */}
      <span className="w-12 shrink-0" />
      <span className="w-14 shrink-0" />
    </div>
  );
}

function SummaryTotals({
  totalExecMs,
  totalWaitMs,
  totalInputTokens,
  totalOutputTokens,
  totalCostUsd,
}: {
  totalExecMs: number;
  totalWaitMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}) {
  const totalTokens = totalInputTokens + totalOutputTokens;
  return (
    <div
      data-testid="activity-summary"
      className="border-border flex flex-col gap-1.5 border-t pt-3"
    >
      <SummaryRow label="Total execution" value={formatDuration(totalExecMs)} />
      {totalWaitMs > 0 ? (
        <>
          <SummaryRow label="Total wait" value={formatDuration(totalWaitMs)} />
          <SummaryRow label="Total wall-clock" value={formatDuration(totalExecMs + totalWaitMs)} />
        </>
      ) : null}
      {totalTokens > 0 ? (
        <SummaryRow
          label="Total tokens"
          value={`${formatTokens(totalTokens)} (${formatTokens(totalInputTokens)} in · ${formatTokens(totalOutputTokens)} out)`}
        />
      ) : null}
      {totalCostUsd > 0 ? <SummaryRow label="Total cost" value={formatCost(totalCostUsd)} /> : null}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

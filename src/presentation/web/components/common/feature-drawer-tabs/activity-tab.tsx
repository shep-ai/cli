'use client';

import { Loader2, AlertCircle, Clock } from 'lucide-react';
import type {
  PhaseTimingData,
  RejectionFeedbackData,
} from '@/app/actions/get-feature-phase-timings';
import { InlineAttachments } from '@/components/common/inline-attachments';
import { formatDuration } from '@/lib/format-duration';

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
    ...nodeTimings.map((t) => t.durationMs ?? 0),
    ...nodeTimings.map((t) => t.approvalWaitMs ?? 0),
    0
  );

  const iterations = buildLifecycleTimeline(timings, rejectionFeedback);
  const hasMultipleIterations = iterations.length > 1;

  const totalExecMs = nodeTimings.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const totalWaitMs = nodeTimings.reduce((sum, t) => sum + (t.approvalWaitMs ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div data-testid="activity-timings" className="flex flex-col gap-3">
        {iterations.map((iteration) => (
          <IterationGroup
            key={iteration.number}
            iteration={iteration}
            showHeader={hasMultipleIterations}
            maxDurationMs={maxDurationMs}
          />
        ))}
      </div>
      {totalExecMs > 0 ? (
        <SummaryTotals totalExecMs={totalExecMs} totalWaitMs={totalWaitMs} />
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
}: {
  iteration: TimelineIteration;
  showHeader: boolean;
  maxDurationMs: number;
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
      {message || hasAttachments ? (
        <div
          data-testid="rejection-feedback-container"
          className="mt-1 ml-2 max-h-[120px] overflow-y-auto"
        >
          {message ? (
            <span
              data-testid="rejection-feedback-text"
              className="text-muted-foreground font-normal italic"
            >
              &mdash; {message}
            </span>
          ) : null}
          {hasAttachments ? (
            <div data-testid="rejection-feedback-attachments" className="mt-1.5">
              <InlineAttachments text="" attachmentPaths={attachments} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function NodeTimingRow({
  timing,
  maxDurationMs,
}: {
  timing: PhaseTimingData;
  maxDurationMs: number;
}) {
  const label = timing.phase.includes(':')
    ? `rev ${timing.phase.split(':')[1]}`
    : (NODE_TO_PHASE[timing.phase] ?? timing.phase);

  const durationMs = timing.durationMs ?? 0;
  const barPercent = maxDurationMs > 0 ? Math.max(2, (durationMs / maxDurationMs) * 100) : 2;
  const barColorClass = timing.completedAt ? 'bg-emerald-500' : 'bg-blue-500';

  return (
    <div className="flex flex-col gap-1">
      <div data-testid={`timing-bar-${timing.phase}`} className="flex items-center gap-3">
        <span className="text-muted-foreground w-24 shrink-0 text-xs">{label}</span>
        <div className="bg-muted h-3 flex-1 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full ${barColorClass}`}
            style={{ width: `${Math.min(barPercent, 100)}%` }}
          />
        </div>
        <span className="text-muted-foreground w-14 shrink-0 text-right text-xs">
          {formatDuration(durationMs)}
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
    <div data-testid={`approval-wait-${timing.phase}`} className="flex items-center gap-3 pl-4">
      <span className="text-muted-foreground w-20 shrink-0 text-xs">approval</span>
      <div className="bg-muted h-2.5 flex-1 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full bg-amber-500"
          style={{ width: `${Math.min(barPercent, 100)}%` }}
        />
      </div>
      <span className="text-muted-foreground w-14 shrink-0 text-right text-xs">
        {formatDuration(waitMs)}
      </span>
    </div>
  );
}

function SummaryTotals({ totalExecMs, totalWaitMs }: { totalExecMs: number; totalWaitMs: number }) {
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

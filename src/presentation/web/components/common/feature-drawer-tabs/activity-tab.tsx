'use client';

import { Loader2, AlertCircle, Clock } from 'lucide-react';
import type { PhaseTimingData } from '@/app/actions/get-feature-phase-timings';

export interface ActivityTabProps {
  timings: PhaseTimingData[] | null;
  loading: boolean;
  error: string | null;
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
};

function isLifecycleEvent(phase: string): boolean {
  return phase.startsWith('run:');
}

function formatDuration(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

interface TimingRunGroup {
  runId: string;
  timings: PhaseTimingData[];
}

function groupTimingsByRun(timings: PhaseTimingData[]): TimingRunGroup[] {
  const groups: TimingRunGroup[] = [];

  for (const t of timings) {
    const last = groups[groups.length - 1];
    if (last?.runId === t.agentRunId) {
      last.timings.push(t);
    } else {
      groups.push({ runId: t.agentRunId, timings: [t] });
    }
  }
  return groups;
}

export function ActivityTab({ timings, loading, error }: ActivityTabProps) {
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

  const groups = groupTimingsByRun(timings);
  const multiRun = groups.length > 1;

  const totalExecMs = nodeTimings.reduce((sum, t) => sum + (t.durationMs ?? 0), 0);
  const totalWaitMs = nodeTimings.reduce((sum, t) => sum + (t.approvalWaitMs ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 p-4">
      <div data-testid="activity-timings" className="flex flex-col gap-3">
        {groups.map((group, groupIdx) => (
          <RunGroup
            key={group.runId}
            group={group}
            groupIdx={groupIdx}
            multiRun={multiRun}
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

function RunGroup({
  group,
  groupIdx,
  multiRun,
  maxDurationMs,
}: {
  group: { runId: string; timings: PhaseTimingData[] };
  groupIdx: number;
  multiRun: boolean;
  maxDurationMs: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {multiRun ? (
        <div className="text-muted-foreground text-xs font-medium">Run #{groupIdx + 1}</div>
      ) : null}
      {group.timings.map((t) => {
        if (isLifecycleEvent(t.phase)) {
          return <LifecycleEventRow key={`${t.agentRunId}-${t.phase}-${t.startedAt}`} timing={t} />;
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

function LifecycleEventRow({ timing }: { timing: PhaseTimingData }) {
  const event = LIFECYCLE_EVENTS[timing.phase];
  if (!event) return null;
  return (
    <div className={`text-xs ${event.colorClass}`}>
      <span>{event.label}</span>
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

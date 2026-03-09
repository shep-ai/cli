'use client';

import { Loader2, Circle, Check, Eye } from 'lucide-react';
import { AlertCircle, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { PlanData, PlanTaskData } from '@/app/actions/get-feature-plan';

export interface PlanTabProps {
  plan: PlanData | null;
  loading: boolean;
  error: string | null;
}

const planStateBadgeStyles: Record<string, string> = {
  Requirements: 'border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50',
  ClarificationRequired: 'border-transparent bg-amber-50 text-amber-700 hover:bg-amber-50',
  Ready: 'border-transparent bg-green-50 text-green-700 hover:bg-green-50',
};

const taskStateConfig: Record<
  string,
  { icon: typeof Circle; colorClass: string; spinning?: boolean }
> = {
  Todo: { icon: Circle, colorClass: 'text-muted-foreground' },
  'Work in Progress': { icon: Loader2, colorClass: 'text-blue-600', spinning: true },
  Done: { icon: Check, colorClass: 'text-emerald-600' },
  Review: { icon: Eye, colorClass: 'text-amber-600' },
};

const defaultTaskConfig = { icon: Circle, colorClass: 'text-muted-foreground' };

export function PlanTab({ plan, loading, error }: PlanTabProps) {
  if (loading) {
    return (
      <div data-testid="plan-tab-loading" className="flex items-center justify-center p-8">
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

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <ListTodo className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No plan created yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">Plan State</span>
        <Badge
          className={
            planStateBadgeStyles[plan.state] ?? 'border-transparent bg-gray-50 text-gray-700'
          }
        >
          {plan.state}
        </Badge>
      </div>
      {plan.overview ? (
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">Overview</span>
          <p className="text-sm leading-relaxed">{plan.overview}</p>
        </div>
      ) : null}
      <TaskList tasks={plan.tasks} />
    </div>
  );
}

function TaskList({ tasks }: { tasks: PlanTaskData[] }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-4">
        <p className="text-muted-foreground text-sm">No tasks defined yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">Tasks</span>
      <div data-testid="plan-task-list" className="flex flex-col gap-2">
        {tasks.map((task, index) => (
          <TaskItem key={task.title || `task-${index}`} task={task} index={index} />
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task, index }: { task: PlanTaskData; index: number }) {
  const config = taskStateConfig[task.state] ?? defaultTaskConfig;
  const Icon = config.icon;

  return (
    <div
      data-testid={`plan-task-${index}`}
      className={`flex items-start gap-2 rounded-md border px-3 py-2 ${config.colorClass}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${config.spinning ? 'animate-spin' : ''}`} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">{task.title}</span>
        {task.description ? (
          <span className="text-muted-foreground text-xs">{task.description}</span>
        ) : null}
      </div>
    </div>
  );
}

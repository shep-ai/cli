'use client';

import { Loader2 } from 'lucide-react';
import { AlertCircle, ListTodo } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TaskProgressView } from '@/components/common/task-progress-view';
import type { PlanData } from '@/app/actions/get-feature-plan';

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
      <TaskProgressView tasks={plan.tasks} />
    </div>
  );
}

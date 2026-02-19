'use client';

import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TechDecisionsReviewProps, TechDecision } from './tech-decisions-review-config';

function TechDecisionCard({ decision }: { decision: TechDecision }) {
  return (
    <div className="border-border space-y-2 rounded-md border px-3 py-3">
      <h4 className="text-foreground text-sm font-semibold">{decision.title}</h4>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">Chosen:</span>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
          {decision.chosen}
        </Badge>
      </div>

      {decision.rejected.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Rejected:</span>
          {decision.rejected.map((alt) => (
            <Badge
              key={alt}
              variant="outline"
              className="text-muted-foreground text-xs font-normal"
            >
              {alt}
            </Badge>
          ))}
        </div>
      ) : null}

      <p className="text-muted-foreground text-xs leading-relaxed">{decision.rationale}</p>
    </div>
  );
}

export function TechDecisionsReview({
  data,
  onApprove,
  isProcessing = false,
}: TechDecisionsReviewProps) {
  const { name, summary, decisions, technologies } = data;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Header */}
        <div className="border-border flex items-start gap-3 border-b pb-3">
          <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1">
            <h3 className="text-foreground mb-1.5 text-sm font-bold">{name}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* Technologies */}
        {technologies.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {technologies.map((tech) => (
              <Badge key={tech} variant="outline" className="text-xs">
                {tech}
              </Badge>
            ))}
          </div>
        ) : null}

        {/* Decision cards */}
        <div className="space-y-3">
          <span className="text-muted-foreground text-xs font-medium">
            {decisions.length} {decisions.length === 1 ? 'decision' : 'decisions'}
          </span>
          {decisions.map((decision, idx) => (
            <TechDecisionCard key={`decision-${idx}`} decision={decision} />
          ))}
        </div>
      </div>

      {/* Footer with approve button */}
      <div className="border-border bg-background shrink-0 border-t p-4">
        <Button
          type="button"
          className="w-full"
          disabled={isProcessing || decisions.length === 0}
          onClick={onApprove}
        >
          <Check className="mr-1 h-4 w-4" />
          Approve Plan
        </Button>
      </div>
    </div>
  );
}

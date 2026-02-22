'use client';

import { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ChevronRight,
  GitCompareArrows,
  Lightbulb,
  Send,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TechDecisionsReviewProps, TechDecision } from './tech-decisions-review-config';

function DecisionCard({ decision, index }: { decision: TechDecision; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-border rounded-lg border">
      <div className="space-y-2.5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary/10 text-primary flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {index + 1}
          </span>
          <h3 className="text-foreground text-base leading-tight font-semibold">
            {decision.title}
          </h3>
        </div>

        <div className="bg-primary/10 border-primary/20 flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
          <CheckCircle2 className="text-primary mt-0.5 h-4 w-4 shrink-0" />
          <span className="text-foreground text-sm font-semibold">{decision.chosen}</span>
        </div>

        {decision.rationale ? (
          <div className="flex items-start gap-2 px-1">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-muted-foreground text-xs leading-relaxed">{decision.rationale}</p>
          </div>
        ) : null}
      </div>

      {decision.rejected.length > 0 ? (
        <div className="border-border border-t px-4 py-2">
          <button
            type="button"
            className="text-muted-foreground flex items-center gap-1.5 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', expanded ? 'rotate-90' : '')}
            />
            {decision.rejected.length} rejected alternative
            {decision.rejected.length > 1 ? 's' : ''}
          </button>
          {expanded ? (
            <ul className="mt-2 space-y-1.5 pl-1">
              {decision.rejected.map((alt) => (
                <li key={alt} className="text-muted-foreground flex items-center gap-2 text-xs">
                  <XCircle className="h-3 w-3 shrink-0 opacity-50" />
                  {alt}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TechDecisionsReview({
  data,
  onRefine,
  onApprove,
  isProcessing = false,
}: TechDecisionsReviewProps) {
  const { summary, decisions } = data;
  const [chatInput, setChatInput] = useState('');

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onRefine(text);
    setChatInput('');
  }

  if (decisions.length === 0) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {summary ? (
          <div className="bg-muted/50 rounded-lg px-4 py-3">
            <p className="text-foreground text-sm leading-relaxed">{summary}</p>
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs font-medium">
              <GitCompareArrows className="h-3.5 w-3.5" />
              {decisions.length} decision{decisions.length !== 1 ? 's' : ''} to review
            </p>
          </div>
        ) : null}
        {decisions.map((decision, i) => (
          <DecisionCard key={decision.title} decision={decision} index={i} />
        ))}
      </div>

      {/* Action bar: chat + approve */}
      <div className="border-border shrink-0 border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4 pb-2">
          <Input
            type="text"
            placeholder="Ask AI to revise the plan..."
            aria-label="Ask AI to revise the plan"
            disabled={isProcessing}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            variant="secondary"
            size="icon"
            aria-label="Send"
            disabled={isProcessing}
          >
            <Send />
          </Button>
        </form>
        <div className="px-4 pt-2 pb-4">
          <Button type="button" className="w-full" disabled={isProcessing} onClick={onApprove}>
            <Check className="mr-1.5 h-4 w-4" />
            Approve Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Check, ChevronRight, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TechDecisionsReviewProps, TechDecision } from './tech-decisions-review-config';

function DecisionCard({ decision }: { decision: TechDecision }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-border rounded-md border">
      <div className="px-3 py-2.5">
        <p className="text-muted-foreground text-[11px] font-medium tracking-wide uppercase">
          {decision.title}
        </p>
        <p className="text-foreground mt-1 text-sm font-semibold">{decision.chosen}</p>
      </div>

      {/* Expandable rejected + rationale */}
      {decision.rejected.length > 0 ? (
        <div className="border-border border-t px-3 py-2">
          <button
            type="button"
            className="text-muted-foreground flex items-center gap-1 text-xs"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <ChevronRight
              className={cn('h-3 w-3 transition-transform', expanded ? 'rotate-90' : '')}
            />
            {decision.rejected.length} rejected alternative
            {decision.rejected.length > 1 ? 's' : ''}
          </button>
          {expanded ? (
            <div className="mt-2 space-y-2">
              <ul className="text-muted-foreground ml-4 list-disc space-y-1 text-xs">
                {decision.rejected.map((alt) => (
                  <li key={alt}>{alt}</li>
                ))}
              </ul>
              {decision.rationale ? (
                <p className="text-muted-foreground text-xs leading-relaxed italic">
                  {decision.rationale}
                </p>
              ) : null}
            </div>
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
          <p className="text-muted-foreground text-xs leading-relaxed">{summary}</p>
        ) : null}
        {decisions.map((decision) => (
          <DecisionCard key={decision.title} decision={decision} />
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

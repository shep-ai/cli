'use client';

import { useState } from 'react';
import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import { Check, ChevronRight, GitCompareArrows, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import { useSoundAction } from '@/hooks/use-sound-action';
import type {
  TechDecisionsReviewProps,
  TechDecisionsReviewData,
  TechDecision,
} from './tech-decisions-review-config';

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="text-muted-foreground mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} text-[11px]`}>{children}</code>
    ) : (
      <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="bg-muted my-2 overflow-x-auto rounded-lg border p-3">{children}</pre>
  ),
  ul: ({ children }) => (
    <ul className="text-muted-foreground mb-2 list-disc space-y-1 pl-4 text-xs">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-muted-foreground mb-2 list-decimal space-y-1 pl-4 text-xs">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

function DecisionCard({ decision, index }: { decision: TechDecision; index: number }) {
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const expandSound = useSoundAction('expand');
  const collapseSound = useSoundAction('collapse');

  const handleToggleAlternatives = () => {
    // Play sound based on current state (before toggle)
    if (alternativesOpen) {
      collapseSound.play();
    } else {
      expandSound.play();
    }
    setAlternativesOpen((prev) => !prev);
  };

  return (
    <div className="border-border rounded-lg border">
      {/* Header: number + title + chosen badge */}
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="text-foreground text-sm leading-tight font-semibold">
                {decision.title}
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs">{decision.chosen}</p>
            </div>
          </div>
          {'decisionName' in decision &&
          (decision as unknown as { decisionName?: string }).decisionName ? (
            <Badge variant="secondary" className="bg-primary/10 text-primary shrink-0">
              {(decision as unknown as { decisionName: string }).decisionName}
            </Badge>
          ) : null}
        </div>

        {/* Rationale */}
        {decision.rationale ? (
          <Markdown components={markdownComponents}>{decision.rationale}</Markdown>
        ) : null}
      </div>

      {/* Rejected alternatives (collapsed by default) */}
      {decision.rejected.length > 0 ? (
        <div className="border-border border-t">
          <button
            type="button"
            onClick={handleToggleAlternatives}
            className="text-muted-foreground hover:bg-muted/50 flex w-full items-center gap-1.5 px-4 py-3 text-xs font-medium transition-colors"
          >
            <ChevronRight
              className={`h-3.5 w-3.5 transition-transform ${alternativesOpen ? 'rotate-90' : ''}`}
            />
            <Layers className="h-3.5 w-3.5" />
            Other Options Considered ({decision.rejected.length})
          </button>
          {alternativesOpen ? (
            <div className="space-y-1.5 px-4 pb-3">
              {decision.rejected.map((alt) => (
                <div key={alt} className="bg-primary/5 rounded-md px-3 py-2">
                  <span className="text-foreground text-xs">{alt}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Renders the tech decisions content (header + decision cards) without the action bar.
 * Used by TechReviewTabs to compose with a shared DrawerActionBar.
 */
export function TechDecisionsContent({ data }: { data: TechDecisionsReviewData }) {
  const { summary, decisions } = data;

  if (decisions.length === 0) return null;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
        <div className="flex-1">
          <h2 className="text-foreground text-sm font-bold">
            Technical Implementation Plan Review
          </h2>
          {summary ? (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{summary}</p>
          ) : null}
        </div>
      </div>

      {/* Section heading */}
      <div className="flex items-center gap-2 pt-1">
        <GitCompareArrows className="text-primary h-4 w-4" />
        <h3 className="text-foreground text-sm font-bold">Technical Decisions</h3>
      </div>

      {/* Decision cards */}
      {decisions.map((decision, i) => (
        <DecisionCard key={decision.title} decision={decision} index={i} />
      ))}
    </div>
  );
}

export function TechDecisionsReview({
  data,
  onApprove,
  onReject,
  isProcessing = false,
  isRejecting = false,
}: TechDecisionsReviewProps) {
  if (data.decisions.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <TechDecisionsContent data={data} />
      </div>

      <DrawerActionBar
        onReject={onReject}
        onApprove={onApprove}
        approveLabel="Approve Plan"
        approveIcon={<Check className="mr-1.5 h-4 w-4" />}
        revisionPlaceholder="Ask AI to revise the plan..."
        isProcessing={isProcessing}
        isRejecting={isRejecting}
      />
    </div>
  );
}

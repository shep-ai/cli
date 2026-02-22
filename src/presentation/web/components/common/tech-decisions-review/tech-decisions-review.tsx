'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { TechDecisionsReviewProps, TechDecision } from './tech-decisions-review-config';

function TechStackCollapsible({ technologies }: { technologies: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        className="text-muted-foreground flex items-center gap-1 text-xs font-medium"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronRight className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`} />
        Tech stack ({technologies.length})
      </button>
      {open ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {technologies.map((tech) => (
            <Badge key={tech} variant="outline" className="text-xs">
              {tech}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildOptions(decision: TechDecision): string[] {
  // Put chosen first, then rejected — preserving original order context
  return [decision.chosen, ...decision.rejected];
}

export function TechDecisionsReview({
  data,
  selections,
  onSelect,
  onApprove,
  isProcessing = false,
}: TechDecisionsReviewProps) {
  const { name, summary, decisions, technologies } = data;
  const [currentStep, setCurrentStep] = useState(0);

  const total = decisions.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === total - 1;
  const currentDecision = decisions[currentStep];
  const options = useMemo(() => buildOptions(currentDecision), [currentDecision]);

  const answeredCount = useMemo(() => Object.keys(selections).length, [selections]);

  const handleSelect = useCallback(
    (index: number, value: string) => {
      onSelect(index, value);
      if (!isLastStep) {
        setTimeout(() => setCurrentStep((s) => s + 1), 250);
      }
    },
    [onSelect, isLastStep]
  );

  if (total === 0) return null;

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

        {/* Technologies (collapsed by default) */}
        {technologies.length > 0 ? <TechStackCollapsible technologies={technologies} /> : null}

        {/* Step indicator */}
        <div className="flex justify-end">
          <div className="flex gap-1">
            {decisions.map((decision, idx) => (
              <button
                key={decision.title}
                type="button"
                aria-label={`Go to decision ${idx + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-200',
                  idx === currentStep ? 'bg-primary w-4' : 'w-1.5',
                  idx !== currentStep && selections[idx] ? 'bg-primary/50' : '',
                  idx !== currentStep && !selections[idx] ? 'bg-muted-foreground/25' : ''
                )}
                onClick={() => setCurrentStep(idx)}
              />
            ))}
          </div>
        </div>

        {/* Current decision */}
        <div className="space-y-3">
          <label className="text-foreground block text-sm font-semibold">
            {currentDecision.title}
          </label>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {currentDecision.rationale}
          </p>
          <div className="space-y-2">
            {options.map((opt, optIdx) => {
              const selected = selections[currentStep] === opt;
              const isOriginalChoice = opt === currentDecision.chosen;
              const letter = String.fromCharCode(65 + optIdx);
              return (
                <button
                  key={opt}
                  type="button"
                  className={cn(
                    'border-border w-full rounded-md border px-3 py-3 text-left text-xs transition-all',
                    'hover:border-primary/70 hover:bg-primary/5 group',
                    selected && 'border-primary bg-primary/5'
                  )}
                  disabled={isProcessing}
                  onClick={() => handleSelect(currentStep, opt)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {letter}.
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-xs font-semibold">{opt}</span>
                        {isOriginalChoice ? (
                          <Badge className="shrink-0 px-1.5 py-0 text-[10px] whitespace-nowrap">
                            AI Recommended
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isFirstStep || isProcessing}
            onClick={() => setCurrentStep((s) => s - 1)}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {isLastStep ? (
            <Button
              type="button"
              size="sm"
              disabled={isProcessing || answeredCount < total}
              onClick={onApprove}
            >
              <Check className="mr-1 h-4 w-4" />
              Approve Plan
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => setCurrentStep((s) => s + 1)}
            >
              {selections[currentStep] ? 'Next' : 'Skip'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="border-border bg-background shrink-0 border-t">
        <div
          className={cn(
            'bg-muted h-1.5 overflow-hidden',
            (answeredCount > 0 && answeredCount < total) || isProcessing
              ? 'opacity-100'
              : 'opacity-0',
            'transition-opacity duration-200'
          )}
          data-testid="progress-bar-container"
        >
          {isProcessing ? (
            <div className="bg-primary animate-indeterminate-progress h-full w-1/3" />
          ) : (
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${total > 0 ? (answeredCount / total) * 100 : 0}%` }}
              data-testid="progress-bar"
            />
          )}
        </div>
      </div>
    </div>
  );
}

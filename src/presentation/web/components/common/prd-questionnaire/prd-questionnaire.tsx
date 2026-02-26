'use client';

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import { useSoundAction } from '@/hooks/use-sound-action';
import type { PrdQuestionnaireProps } from './prd-questionnaire-config';

export function PrdQuestionnaire({
  data,
  selections,
  onSelect,
  onApprove,
  onReject,
  isProcessing = false,
  isRejecting = false,
  showHeader = false,
}: PrdQuestionnaireProps) {
  const { question, context, questions, finalAction } = data;
  const [currentStep, setCurrentStep] = useState(0);
  const selectSound = useSoundAction('select');
  const navigateSound = useSoundAction('navigate');

  const total = questions.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === total - 1;
  const currentQuestion = questions[currentStep];

  const answeredCount = useMemo(() => Object.keys(selections).length, [selections]);

  const handleSelect = useCallback(
    (questionId: string, optionId: string) => {
      selectSound.play();
      onSelect(questionId, optionId);
      // Auto-advance to the next step after selection (unless last step)
      if (!isLastStep) {
        setTimeout(() => setCurrentStep((s) => s + 1), 250);
      }
    },
    [onSelect, isLastStep, selectSound]
  );

  if (total === 0) return null;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Header */}
        {showHeader ? (
          <div className="border-border flex items-start gap-3 border-b pb-3">
            <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
            <div className="flex-1">
              <h3 className="text-foreground mb-1.5 text-sm font-bold">{question}</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">{context}</p>
            </div>
          </div>
        ) : null}

        {/* Question + step indicator */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <label className="text-foreground min-w-0 flex-1 text-sm font-semibold">
              {currentQuestion.question}
            </label>
            <div className="mt-1.5 flex shrink-0 gap-1">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  type="button"
                  aria-label={`Go to question ${idx + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    idx === currentStep ? 'bg-primary w-4' : 'w-1.5',
                    idx !== currentStep && selections[q.id] ? 'bg-primary/50' : '',
                    idx !== currentStep && !selections[q.id] ? 'bg-muted-foreground/25' : ''
                  )}
                  onClick={() => {
                    navigateSound.play();
                    setCurrentStep(idx);
                  }}
                />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {currentQuestion.options.map((opt, optIdx) => {
              const selected = selections[currentQuestion.id] === opt.id;
              const letter = String.fromCharCode(65 + optIdx);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={cn(
                    'border-border w-full rounded-md border px-3 py-3 text-left text-xs transition-all',
                    'hover:border-primary/70 hover:bg-primary/5 group',
                    selected && 'border-primary bg-primary/5',
                    opt.isNew && 'animate-option-highlight'
                  )}
                  disabled={isProcessing}
                  onClick={() => handleSelect(currentQuestion.id, opt.id)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted-foreground mt-0.5 font-mono text-xs">
                      {letter}.
                    </span>
                    <div className="flex-1">
                      <div className="mb-0.5 flex items-center gap-2">
                        <span className="text-foreground text-xs font-semibold">{opt.label}</span>
                        {opt.recommended ? (
                          <Badge className="px-1.5 py-0 text-[10px]">AI Recommended</Badge>
                        ) : null}
                        {opt.isNew ? (
                          <Badge className="border-transparent bg-emerald-600 px-1.5 py-0 text-[10px] text-white hover:bg-emerald-600/80">
                            New
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-muted-foreground text-xs leading-snug">
                        {opt.rationale}
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
            onClick={() => {
              navigateSound.play();
              setCurrentStep((s) => s - 1);
            }}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>

          {!isLastStep ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isProcessing}
              onClick={() => {
                navigateSound.play();
                setCurrentStep((s) => s + 1);
              }}
            >
              {selections[currentQuestion.id] ? 'Next' : 'Skip'}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <DrawerActionBar
        onReject={onReject}
        onApprove={() => onApprove(finalAction.id)}
        approveLabel={finalAction.label}
        approveIcon={<Check className="mr-1.5 h-4 w-4" />}
        revisionPlaceholder="Ask AI to refine requirements..."
        isProcessing={isProcessing}
        isRejecting={isRejecting}
      >
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
      </DrawerActionBar>
    </div>
  );
}

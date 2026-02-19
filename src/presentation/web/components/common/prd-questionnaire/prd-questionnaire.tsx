'use client';

import { Send, Check } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { PrdQuestionnaireProps } from './prd-questionnaire-config';

export function PrdQuestionnaire({
  question,
  context,
  questions,
  selections,
  finalAction,
  onSelect,
  onRefine,
  onApprove,
  isProcessing = false,
}: PrdQuestionnaireProps) {
  const [chatInput, setChatInput] = useState('');

  const progress = useMemo(
    () => (questions.length > 0 ? (Object.keys(selections).length / questions.length) * 100 : 0),
    [selections, questions.length]
  );

  const progressVisible = progress > 0 || isProcessing;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;
    onRefine(text);
    setChatInput('');
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Header */}
        <div className="border-border flex items-start gap-3 border-b pb-3">
          <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1">
            <h3 className="text-foreground mb-1.5 text-sm font-bold">{question}</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">{context}</p>
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <label className="text-muted-foreground block text-xs font-semibold">
              {idx + 1}. {q.question}
            </label>
            <div className="space-y-1.5">
              {q.options.map((opt, optIdx) => {
                const selected = selections[q.id] === opt.id;
                const letter = String.fromCharCode(65 + optIdx);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={cn(
                      'border-border w-full rounded-md border px-3 py-2.5 text-left text-xs transition-all',
                      'hover:border-primary/70 hover:bg-primary/5 group',
                      selected && 'border-primary bg-primary/5',
                      opt.isNew && 'animate-option-highlight'
                    )}
                    disabled={isProcessing}
                    onClick={() => onSelect(q.id, opt.id)}
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
        ))}
      </div>

      {/* Action Bar */}
      <div className="border-border bg-background flex-shrink-0 border-t">
        <div
          className={cn(
            'bg-muted h-1.5 overflow-hidden',
            progressVisible ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-200'
          )}
          data-testid="progress-bar-container"
        >
          {isProcessing ? (
            <div className="bg-primary animate-indeterminate-progress h-full w-1/3" />
          ) : (
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-4">
          <Input
            type="text"
            placeholder="Ask AI to refine requirements..."
            aria-label="Ask AI to refine requirements"
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
          <Button
            type="button"
            size="icon"
            aria-label={finalAction.label}
            disabled={isProcessing}
            onClick={() => onApprove(finalAction.id)}
          >
            <Check />
          </Button>
        </form>
      </div>
    </div>
  );
}

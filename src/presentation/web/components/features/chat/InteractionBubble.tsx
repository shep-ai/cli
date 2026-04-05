'use client';

import { useState, useCallback } from 'react';
import { Check, MessageCircleQuestion } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Shape matching UserQuestion from the agent executor interface. */
interface QuestionOption {
  label: string;
  description: string;
  preview?: string;
}

interface Question {
  question: string;
  header: string;
  options: QuestionOption[];
  multiSelect: boolean;
}

export interface InteractionData {
  toolCallId: string;
  questions: Question[];
}

export interface InteractionBubbleProps {
  interaction: InteractionData;
  onSubmit: (answers: Record<string, string>) => void;
  className?: string;
}

/**
 * Renders an agent's AskUserQuestion interaction inline in the chat thread.
 *
 * - Single question: renders options directly
 * - Multiple questions: tabbed interface with header chips as tabs
 *
 * After submission, the bubble disappears and a green summary message
 * is persisted in the conversation history (rendered by InteractionResponseMessage in thread.tsx).
 */
export function InteractionBubble({ interaction, onSubmit, className }: InteractionBubbleProps) {
  const isMultiQuestion = interaction.questions.length > 1;

  return (
    <div className={cn('group flex w-full items-start gap-2.5 px-4 py-0.5', className)}>
      <div className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
        <MessageCircleQuestion className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="text-foreground mt-px overflow-hidden rounded-2xl rounded-tl-sm border border-violet-200 bg-violet-50/50 text-sm leading-relaxed shadow-sm dark:border-violet-500/20 dark:bg-violet-950/20">
          {isMultiQuestion ? (
            <TabbedQuestions questions={interaction.questions} onSubmit={onSubmit} />
          ) : (
            <div className="px-4 py-3">
              <SingleQuestion question={interaction.questions[0]} onSubmit={onSubmit} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Tabbed multi-question layout ────────────────────────────────────────

/** Per-question selection state, lifted to TabbedQuestions so tab switches preserve it. */
interface QuestionSelectionState {
  selectedOptions: Set<string>;
  otherText: string;
  isOtherSelected: boolean;
}

function TabbedQuestions({
  questions,
  onSubmit,
}: {
  questions: Question[];
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);

  // All per-question state lives here — indexed by question text
  const [selections, setSelections] = useState<Record<string, QuestionSelectionState>>(() => {
    const init: Record<string, QuestionSelectionState> = {};
    for (const q of questions) {
      init[q.question] = { selectedOptions: new Set(), otherText: '', isOtherSelected: false };
    }
    return init;
  });

  const updateSelection = useCallback(
    (questionText: string, updater: (prev: QuestionSelectionState) => QuestionSelectionState) => {
      setSelections((prev) => ({
        ...prev,
        [questionText]: updater(prev[questionText]),
      }));
    },
    []
  );

  // Derive answers from selections
  const answers: Record<string, string> = {};
  for (const q of questions) {
    const s = selections[q.question];
    if (!s) continue;
    const parts: string[] = [...s.selectedOptions];
    if (s.isOtherSelected && s.otherText.trim()) parts.push(s.otherText.trim());
    if (parts.length > 0) answers[q.question] = parts.join(', ');
  }

  const allAnswered = questions.every((q) => answers[q.question]);

  const handleSubmit = useCallback(() => {
    if (!allAnswered) return;
    onSubmit(answers);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- answers is derived, stable enough
  }, [allAnswered, onSubmit, selections]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-violet-200 dark:border-violet-500/20">
        {questions.map((q, i) => {
          const isActive = i === activeTab;
          const hasAnswer = !!answers[q.question];
          return (
            <button
              key={q.question}
              type="button"
              onClick={() => setActiveTab(i)}
              className={cn(
                'relative flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors',
                isActive
                  ? 'text-violet-700 dark:text-violet-300'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {hasAnswer ? (
                <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <span className="text-muted-foreground/50 text-[10px]">{i + 1}.</span>
              )}
              {q.header}
              {isActive ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-violet-600 dark:bg-violet-400" />
              ) : null}
            </button>
          );
        })}
      </div>

      {/* All panels rendered — only active one visible (preserves state) */}
      {questions.map((q, i) => (
        <div
          key={q.question}
          className="px-4 py-3"
          style={{ display: i === activeTab ? undefined : 'none' }}
        >
          <QuestionPanel
            question={q}
            selection={selections[q.question]}
            onSelectionChange={(updater) => updateSelection(q.question, updater)}
          />
        </div>
      ))}

      {/* Submit bar */}
      <div className="flex items-center gap-3 border-t border-violet-200 px-4 py-2.5 dark:border-violet-500/20">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!allAnswered}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            allAnswered
              ? 'bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] dark:bg-violet-600 dark:hover:bg-violet-500'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Check className="h-3 w-3" />
          Submit all
        </button>
        <span className="text-muted-foreground text-[10px]">
          {Object.keys(answers).length}/{questions.length} answered
        </span>
      </div>
    </div>
  );
}

// ── Question panel (used inside tabs) ───────────────────────────────────

function QuestionPanel({
  question,
  selection,
  onSelectionChange,
}: {
  question: Question;
  selection: QuestionSelectionState;
  onSelectionChange: (updater: (prev: QuestionSelectionState) => QuestionSelectionState) => void;
}) {
  const handleOptionToggle = useCallback(
    (label: string) => {
      onSelectionChange((prev) => {
        const next = new Set(prev.selectedOptions);
        if (question.multiSelect) {
          if (next.has(label)) next.delete(label);
          else next.add(label);
        } else {
          next.clear();
          next.add(label);
          return { ...prev, selectedOptions: next, isOtherSelected: false };
        }
        return { ...prev, selectedOptions: next };
      });
    },
    [question.multiSelect, onSelectionChange]
  );

  const handleOtherToggle = useCallback(() => {
    onSelectionChange((prev) => {
      if (question.multiSelect) {
        return { ...prev, isOtherSelected: !prev.isOtherSelected };
      }
      return { selectedOptions: new Set(), otherText: prev.otherText, isOtherSelected: true };
    });
  }, [question.multiSelect, onSelectionChange]);

  const handleOtherTextChange = useCallback(
    (text: string) => {
      onSelectionChange((prev) => ({ ...prev, otherText: text }));
    },
    [onSelectionChange]
  );

  return (
    <div>
      <p className="text-foreground mb-2 text-xs font-medium">
        {question.question}
        {question.multiSelect ? (
          <span className="text-muted-foreground ml-1 font-normal">(select multiple)</span>
        ) : null}
      </p>
      <div className="flex flex-col gap-1.5">
        {question.options.map((opt) => (
          <OptionRow
            key={opt.label}
            option={opt}
            isSelected={selection.selectedOptions.has(opt.label)}
            isMulti={question.multiSelect}
            onToggle={() => handleOptionToggle(opt.label)}
          />
        ))}
        <OtherRow
          isSelected={selection.isOtherSelected}
          isMulti={question.multiSelect}
          text={selection.otherText}
          onToggle={handleOtherToggle}
          onTextChange={handleOtherTextChange}
        />
      </div>
    </div>
  );
}

// ── Single question (no tabs) ───────────────────────────────────────────

function SingleQuestion({
  question,
  onSubmit,
}: {
  question: Question;
  onSubmit: (answers: Record<string, string>) => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState('');
  const [isOtherSelected, setIsOtherSelected] = useState(false);

  const handleOptionToggle = useCallback(
    (label: string) => {
      setSelectedOptions((prev) => {
        const next = new Set(prev);
        if (question.multiSelect) {
          if (next.has(label)) next.delete(label);
          else next.add(label);
        } else {
          next.clear();
          next.add(label);
          setIsOtherSelected(false);
        }
        return next;
      });
      if (!question.multiSelect) setIsOtherSelected(false);
    },
    [question.multiSelect]
  );

  const handleOtherToggle = useCallback(() => {
    if (question.multiSelect) {
      setIsOtherSelected((prev) => !prev);
    } else {
      setSelectedOptions(new Set());
      setIsOtherSelected(true);
    }
  }, [question.multiSelect]);

  const handleSubmit = useCallback(() => {
    const parts: string[] = [...selectedOptions];
    if (isOtherSelected && otherText.trim()) parts.push(otherText.trim());
    if (parts.length === 0) return;
    onSubmit({ [question.question]: parts.join(', ') });
  }, [selectedOptions, isOtherSelected, otherText, onSubmit, question.question]);

  const hasSelection = selectedOptions.size > 0 || (isOtherSelected && otherText.trim());

  return (
    <div>
      <div className="mb-2 flex items-start gap-2">
        <span className="inline-flex shrink-0 items-center rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-violet-700 uppercase dark:bg-violet-900/50 dark:text-violet-300">
          {question.header}
        </span>
        <span className="font-medium">{question.question}</span>
      </div>

      <div className="ml-0.5 flex flex-col gap-1.5">
        {question.options.map((opt) => (
          <OptionRow
            key={opt.label}
            option={opt}
            isSelected={selectedOptions.has(opt.label)}
            isMulti={question.multiSelect}
            onToggle={() => handleOptionToggle(opt.label)}
          />
        ))}
        <OtherRow
          isSelected={isOtherSelected}
          isMulti={question.multiSelect}
          text={otherText}
          onToggle={handleOtherToggle}
          onTextChange={setOtherText}
        />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!hasSelection}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
            hasSelection
              ? 'bg-violet-600 text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] dark:bg-violet-600 dark:hover:bg-violet-500'
              : 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
          )}
        >
          <Check className="h-3 w-3" />
          Submit
        </button>
        {question.multiSelect ? (
          <span className="text-muted-foreground text-[10px]">Select one or more</span>
        ) : null}
      </div>
    </div>
  );
}

// ── Option row ──────────────────────────────────────────────────────────

interface OptionRowProps {
  option: QuestionOption;
  isSelected: boolean;
  isMulti: boolean;
  onToggle: () => void;
}

function OptionRow({ option, isSelected, isMulti, onToggle }: OptionRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-xs transition-all',
        isSelected
          ? 'border-violet-300 bg-violet-100/60 shadow-sm dark:border-violet-500/40 dark:bg-violet-900/30'
          : 'border-border/50 hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-500/30 dark:hover:bg-violet-900/10'
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors',
          isMulti ? 'rounded' : 'rounded-full',
          isSelected
            ? 'border-violet-600 bg-violet-600 dark:border-violet-500 dark:bg-violet-500'
            : 'border-muted-foreground/30'
        )}
      >
        {isSelected ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
      </span>

      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={cn('font-medium', isSelected && 'text-violet-700 dark:text-violet-300')}>
          {option.label}
        </span>
        <span className="text-muted-foreground text-[11px] leading-snug">{option.description}</span>
      </div>
    </button>
  );
}

// ── "Other" free-text row ───────────────────────────────────────────────

interface OtherRowProps {
  isSelected: boolean;
  isMulti: boolean;
  text: string;
  onToggle: () => void;
  onTextChange: (text: string) => void;
}

function OtherRow({ isSelected, isMulti, text, onToggle, onTextChange }: OtherRowProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-lg border px-3 py-2 text-xs transition-all',
        isSelected
          ? 'border-violet-300 bg-violet-100/60 shadow-sm dark:border-violet-500/40 dark:bg-violet-900/30'
          : 'border-border/50 hover:border-violet-300 dark:hover:border-violet-500/30'
      )}
    >
      <button type="button" onClick={onToggle} className="mt-0.5 shrink-0">
        <span
          className={cn(
            'flex h-4 w-4 items-center justify-center border transition-colors',
            isMulti ? 'rounded' : 'rounded-full',
            isSelected
              ? 'border-violet-600 bg-violet-600 dark:border-violet-500 dark:bg-violet-500'
              : 'border-muted-foreground/30'
          )}
        >
          {isSelected ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
        </span>
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('font-medium', isSelected && 'text-violet-700 dark:text-violet-300')}>
          Other
        </span>
        {isSelected ? (
          <input
            type="text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="Type your answer..."
            className="w-full rounded-md border border-violet-200 bg-white/80 px-2 py-1 text-xs outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-300/30 dark:border-violet-500/30 dark:bg-violet-950/30 dark:focus:border-violet-500/50 dark:focus:ring-violet-500/20"
            autoFocus
          />
        ) : null}
      </div>
    </div>
  );
}

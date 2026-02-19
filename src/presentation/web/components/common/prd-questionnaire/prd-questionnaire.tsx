'use client';

import { Send, Check } from 'lucide-react';
import React, { useMemo, useState } from 'react';
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
        <div className="flex items-start gap-3 border-b border-slate-200 pb-3">
          <div className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-amber-500" />
          <div className="flex-1">
            <h3 className="mb-1.5 text-sm font-bold text-slate-800">{question}</h3>
            <p className="text-xs leading-relaxed text-slate-600">{context}</p>
          </div>
        </div>

        {/* Questions */}
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-2">
            <label className="block text-[10px] font-bold text-slate-600">
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
                    className={`w-full rounded border px-3 py-2 text-left ${selected ? 'border-blue-500 bg-blue-50' : 'border-slate-200'} group text-[10px] transition-all hover:border-blue-400 hover:bg-blue-50 ${opt.isNew ? 'animate-option-highlight' : ''}`}
                    disabled={isProcessing}
                    onClick={() => onSelect(q.id, opt.id)}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 font-mono text-[9px] text-slate-400">{letter}.</span>
                      <div className="flex-1">
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{opt.label}</span>
                          {opt.recommended ? (
                            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-white uppercase">
                              AI Recommended
                            </span>
                          ) : null}
                          {opt.isNew ? (
                            <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[8px] font-bold tracking-wide text-white uppercase">
                              New
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[9px] leading-tight text-slate-500">
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
      <div className="flex-shrink-0 border-t border-slate-200 bg-white">
        <div
          className={`h-1 overflow-hidden bg-slate-100 ${progressVisible ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
          data-testid="progress-bar-container"
        >
          {isProcessing ? (
            <div className="animate-indeterminate-progress h-full w-1/3 bg-blue-600" />
          ) : (
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
              data-testid="progress-bar"
            />
          )}
        </div>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3">
          <input
            type="text"
            placeholder="Ask AI to refine requirements..."
            aria-label="Ask AI to refine requirements"
            className="flex-1 rounded border border-slate-200 px-3 py-2 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            disabled={isProcessing}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
          />
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-200"
            disabled={isProcessing}
          >
            <Send size={10} />
            Send
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded bg-blue-600 px-6 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
            disabled={isProcessing}
            onClick={() => onApprove(finalAction.id)}
          >
            <Check size={10} />
            {finalAction.label}
          </button>
        </form>
      </div>
    </div>
  );
}

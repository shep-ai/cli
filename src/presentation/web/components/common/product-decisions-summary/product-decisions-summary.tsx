'use client';

import { ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type {
  ProductDecisionsSummaryProps,
  ProductDecisionItem,
} from './product-decisions-summary-config';

function ProductDecisionCard({ item, index }: { item: ProductDecisionItem; index: number }) {
  return (
    <div className="border-border rounded-lg border">
      <div className="space-y-2 px-4 py-3">
        <div className="flex items-start gap-2.5">
          <span className="bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-foreground text-sm leading-tight font-semibold">{item.question}</h3>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-muted-foreground text-xs">{item.selectedOption}</p>
              {item.wasRecommended ? (
                <Badge className="px-1.5 py-0 text-[10px]">AI Recommended</Badge>
              ) : null}
            </div>
          </div>
        </div>

        {item.rationale ? (
          <p className="text-muted-foreground text-xs leading-relaxed">{item.rationale}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ProductDecisionsSummary({ data }: ProductDecisionsSummaryProps) {
  const { questions } = data;

  if (questions.length === 0) return null;

  return (
    <div className="space-y-4 p-4">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <ClipboardList className="text-primary h-4 w-4" />
        <h3 className="text-foreground text-sm font-bold">Product Decisions</h3>
      </div>

      {/* Decision cards */}
      {questions.map((item, i) => (
        <ProductDecisionCard key={item.question} item={item} index={i} />
      ))}
    </div>
  );
}

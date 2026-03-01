'use client';

import { Check, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DrawerActionBar } from '@/components/common/drawer-action-bar';
import { TechDecisionsContent } from '@/components/common/tech-decisions-review';
import { ProductDecisionsSummary } from '@/components/common/product-decisions-summary';
import type { TechReviewTabsProps } from './tech-review-tabs-config';

export function TechReviewTabs({
  techData,
  productData,
  onApprove,
  onReject,
  isProcessing = false,
  isRejecting = false,
}: TechReviewTabsProps) {
  if (techData.decisions.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Tabs defaultValue="technical" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="product">Product</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="product" className="mt-0 flex-1 overflow-y-auto">
          {productData === null ? (
            <div className="flex items-center justify-center p-8" data-testid="product-loading">
              <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
            </div>
          ) : productData ? (
            <ProductDecisionsSummary data={productData} />
          ) : (
            <p className="text-muted-foreground p-4 text-center text-sm">
              No product decisions available.
            </p>
          )}
        </TabsContent>

        <TabsContent value="technical" className="mt-0 flex-1 overflow-y-auto">
          <TechDecisionsContent data={techData} />
        </TabsContent>
      </Tabs>

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

'use client';

import { XIcon } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { PrdQuestionnaire } from './prd-questionnaire';
import type { PrdQuestionnaireDrawerProps } from './prd-questionnaire-config';

export function PrdQuestionnaireDrawer({
  open,
  onClose,
  featureName,
  featureId,
  lifecycleLabel,
  ...questionnaireProps
}: PrdQuestionnaireDrawerProps) {
  const { questions, selections } = questionnaireProps;
  const answered = Object.keys(selections).length;
  const total = questions.length;
  const progress = total > 0 ? (answered / total) * 100 : 0;

  return (
    <Drawer
      direction="right"
      modal={false}
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <DrawerContent direction="right" className="w-96" showCloseButton={false}>
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
        >
          <XIcon className="size-4" />
        </button>

        {/* Header */}
        <DrawerHeader>
          <DrawerTitle>{featureName}</DrawerTitle>
          {featureId ? <DrawerDescription>{featureId}</DrawerDescription> : null}
        </DrawerHeader>

        {/* Status section */}
        <div className="flex flex-col gap-3 px-4 pb-3">
          {lifecycleLabel ? (
            <div className="text-muted-foreground text-xs font-semibold tracking-wider">
              {lifecycleLabel}
            </div>
          ) : null}
          <div className="flex flex-col gap-1">
            <div className="text-muted-foreground flex items-center justify-between text-xs">
              <span>Questions answered</span>
              <span>
                {answered}/{total}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Questionnaire body */}
        <div className="flex min-h-0 flex-1 flex-col">
          <PrdQuestionnaire {...questionnaireProps} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

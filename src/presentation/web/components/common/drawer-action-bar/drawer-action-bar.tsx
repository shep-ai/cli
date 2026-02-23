'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RejectFeedbackDialog } from '@/components/common/reject-feedback-dialog';
import { DrawerRevisionInput } from '@/components/common/drawer-revision-input';
import type { DrawerActionBarProps } from './drawer-action-bar-config';

export function DrawerActionBar({
  onReject,
  onApprove,
  approveLabel,
  approveIcon,
  revisionPlaceholder,
  rejectDialogTitle,
  isProcessing = false,
  isRejecting = false,
  showRejectButton = true,
  children,
}: DrawerActionBarProps) {
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const disabled = isProcessing || isRejecting;

  return (
    <div className="border-border shrink-0 border-t">
      {children}
      {onReject ? (
        <DrawerRevisionInput
          onSubmit={onReject}
          placeholder={revisionPlaceholder}
          disabled={disabled || !onReject}
        />
      ) : null}
      <div className="flex items-center gap-2 px-4 pb-4">
        {onReject && showRejectButton ? (
          <>
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={disabled}
              onClick={() => setRejectDialogOpen(true)}
            >
              <X className="mr-1.5 h-4 w-4" />
              Reject
            </Button>
            <RejectFeedbackDialog
              open={rejectDialogOpen}
              onOpenChange={setRejectDialogOpen}
              onConfirm={onReject}
              isSubmitting={isRejecting}
              title={rejectDialogTitle}
            />
          </>
        ) : null}
        <Button type="button" className="flex-1" disabled={disabled} onClick={onApprove}>
          {approveIcon}
          {approveLabel}
        </Button>
      </div>
    </div>
  );
}

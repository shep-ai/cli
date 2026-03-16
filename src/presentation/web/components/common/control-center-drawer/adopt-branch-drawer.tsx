'use client';

import { useState, useCallback } from 'react';
import { GitBranch, Loader2 } from 'lucide-react';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface AdoptBranchDrawerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (branchName: string) => void;
  isSubmitting?: boolean;
  error?: string;
}

export function AdoptBranchDrawer({
  open,
  onClose,
  onSubmit,
  isSubmitting = false,
  error,
}: AdoptBranchDrawerProps) {
  const [branchName, setBranchName] = useState('');

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = branchName.trim();
      if (!trimmed || isSubmitting) return;
      onSubmit(trimmed);
    },
    [branchName, isSubmitting, onSubmit]
  );

  const handleClose = useCallback(() => {
    setBranchName('');
    onClose();
  }, [onClose]);

  // Reset form when drawer closes
  const isDisabled = !branchName.trim() || isSubmitting;

  const header = (
    <div>
      <DrawerTitle className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        Adopt Branch
      </DrawerTitle>
      <DrawerDescription className="text-muted-foreground text-sm">
        Import an existing git branch into Shep&apos;s feature tracking
      </DrawerDescription>
    </div>
  );

  return (
    <BaseDrawer
      open={open}
      onClose={handleClose}
      size="sm"
      modal={false}
      header={header}
      data-testid="adopt-branch-drawer"
    >
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input
                id="branch-name"
                placeholder="e.g. fix/login-bug or feat/user-auth"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={isSubmitting}
                autoFocus
                data-testid="adopt-branch-input"
              />
              <p className="text-muted-foreground text-xs">
                Enter the name of a local or remote branch to adopt as a tracked feature.
              </p>
            </div>

            {error ? (
              <p className="text-destructive text-sm" data-testid="adopt-branch-error">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isDisabled}
              className="flex-1"
              data-testid="adopt-branch-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adopting...
                </>
              ) : (
                'Adopt Branch'
              )}
            </Button>
          </div>
        </div>
      </form>
    </BaseDrawer>
  );
}

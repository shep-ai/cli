'use client';

import { useRef, useEffect } from 'react';
import { XIcon, Play, Square } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/common/action-button';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerOverlay,
} from '@/components/ui/drawer';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDeployAction, type DeployActionInput } from '@/hooks/use-deploy-action';
import { featureFlags } from '@/lib/feature-flags';

const drawerVariants = cva('', {
  variants: {
    size: {
      sm: 'w-96',
      md: 'w-xl',
    },
  },
  defaultVariants: {
    size: 'sm',
  },
});

export interface BaseDrawerProps extends VariantProps<typeof drawerVariants> {
  open: boolean;
  onClose: () => void;
  modal?: boolean;
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
  deployTarget?: DeployActionInput;
}

export function BaseDrawer({
  open,
  onClose,
  modal = false,
  size,
  header,
  children,
  footer,
  className,
  'data-testid': testId,
  deployTarget,
}: BaseDrawerProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the drawer panel (no overlay needed — canvas stays draggable).
  // Uses `click` (not `pointerdown`) so canvas drags don't trigger this.
  useEffect(() => {
    if (!open || modal) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (contentRef.current?.contains(target)) return;
      // Don't close when clicking inside the canvas or other Radix overlays
      if (
        target.closest(
          '[data-no-drawer-close], [role="alertdialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'
        )
      )
        return;
      onClose();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open, modal, onClose]);

  return (
    <Drawer
      direction="right"
      modal={modal}
      handleOnly
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      {modal ? <DrawerOverlay /> : null}
      <DrawerContent
        ref={contentRef}
        direction="right"
        showCloseButton={false}
        className={cn(drawerVariants({ size }), className)}
        data-testid={testId}
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
          data-testid={testId ? `${testId}-close-button` : undefined}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </button>

        {/* Header slot */}
        {header ? <DrawerHeader className="shrink-0">{header}</DrawerHeader> : null}

        {/* Separator between header and content — matches review drawer style */}
        {header ? <Separator /> : null}

        {/* Dev server bar — rendered when deployTarget is provided and env deploy is enabled */}
        {featureFlags.envDeploy && deployTarget ? <DeployBar deployTarget={deployTarget} /> : null}

        {/* Scrollable content area. Consumers should add p-4 for consistent spacing. */}
        {/* Footer components like DrawerActionBar typically include border-t. */}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>

        {/* Footer slot */}
        {footer ? <DrawerFooter className="shrink-0">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}

function DeployBar({ deployTarget }: { deployTarget: DeployActionInput }) {
  const deployAction = useDeployAction(deployTarget);
  const isDeploymentActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';

  return (
    <div data-testid="base-drawer-deploy-bar" className="flex items-center gap-2 px-4 pb-3">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <ActionButton
                label={isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
                onClick={isDeploymentActive ? deployAction.stop : deployAction.deploy}
                loading={deployAction.deployLoading || deployAction.stopLoading}
                error={!!deployAction.deployError}
                icon={isDeploymentActive ? Square : Play}
                iconOnly
                variant="outline"
                size="icon-sm"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {isDeploymentActive ? 'Stop Dev Server' : 'Start Dev Server'}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {isDeploymentActive ? (
        <DeploymentStatusBadge status={deployAction.status} url={deployAction.url} />
      ) : null}
    </div>
  );
}

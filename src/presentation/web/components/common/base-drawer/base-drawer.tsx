'use client';

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
        {header ? <DrawerHeader>{header}</DrawerHeader> : null}

        {/* Dev server bar — rendered when deployTarget is provided and env deploy is enabled */}
        {featureFlags.envDeploy && deployTarget ? <DeployBar deployTarget={deployTarget} /> : null}

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col">{children}</div>
        </div>

        {/* Footer slot */}
        {footer ? <DrawerFooter>{footer}</DrawerFooter> : null}
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

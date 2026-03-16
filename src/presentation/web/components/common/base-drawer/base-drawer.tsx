'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import { XIcon, Play, Square, Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ActionButton } from '@/components/common/action-button';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { DeployModeToggle } from '@/components/common/base-drawer/deploy-mode-toggle';
import { CacheSummary } from '@/components/common/base-drawer/cache-summary';
import { DevEnvAnalysisEditor } from '@/components/common/base-drawer/dev-env-analysis-editor';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerOverlay,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { DevEnvironmentAnalysis } from '@shepai/core/domain/generated/output';
import { useDeployAction, type DeployActionInput } from '@/hooks/use-deploy-action';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import { updateDevEnvAnalysis } from '@/app/actions/update-dev-env-analysis';
import { analyzeRepository } from '@/app/actions/analyze-repository';

const drawerVariants = cva('', {
  variants: {
    size: {
      sm: 'w-96',
      md: 'w-2xl',
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
  /** When true, clicking anywhere outside the drawer closes it, ignoring `data-no-drawer-close` guards. */
  dismissOnOutsideClick?: boolean;
  title?: string;
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
  dismissOnOutsideClick = false,
  title = 'Drawer',
  size,
  header,
  children,
  footer,
  className,
  'data-testid': testId,
  deployTarget,
}: BaseDrawerProps) {
  const featureFlags = useFeatureFlags();
  const contentRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside the drawer panel (no overlay needed — canvas stays draggable).
  // Uses `click` (not `pointerdown`) so canvas drags don't trigger this.
  useEffect(() => {
    if (!open || modal) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      // If the clicked element was unmounted by React before the event reached
      // the document (e.g. a "Next" button removed on the last step), it is no
      // longer in the DOM tree — treat it as an internal click, not an outside one.
      if (!document.body.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      // Don't close when clicking inside Radix overlays.
      // When dismissOnOutsideClick is false (default), also respect data-no-drawer-close guards.
      const ignoreSelector = dismissOnOutsideClick
        ? '[role="alertdialog"], [role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]'
        : '[data-no-drawer-close], [role="alertdialog"], [role="dialog"], [role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]';
      if (target.closest(ignoreSelector)) return;
      onClose();
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [open, modal, onClose, dismissOnOutsideClick]);

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
        onInteractOutside={modal ? undefined : (e) => e.preventDefault()}
      >
        {/* Visually hidden title & description required by Radix Dialog for accessibility */}
        <DrawerTitle asChild>
          <span className="sr-only">{title}</span>
        </DrawerTitle>
        <DrawerDescription asChild>
          <span className="sr-only">{title}</span>
        </DrawerDescription>

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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

        {/* Footer slot */}
        {footer ? <DrawerFooter className="shrink-0">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  );
}

function DeployBar({ deployTarget }: { deployTarget: DeployActionInput }) {
  const deployAction = useDeployAction(deployTarget);
  const isDeploymentActive = deployAction.status === 'Booting' || deployAction.status === 'Ready';
  const isNotStartable = deployAction.status === 'NotStartable';
  const [editorOpen, setEditorOpen] = useState(false);
  const [fullAnalysis, setFullAnalysis] = useState<DevEnvironmentAnalysis | null>(null);

  const handleEdit = useCallback(async () => {
    // Load the full analysis from cache to populate the editor
    const result = await analyzeRepository(deployTarget.repositoryPath);
    if (result.success) {
      setFullAnalysis(result.analysis);
      setEditorOpen(true);
    }
  }, [deployTarget.repositoryPath]);

  const handleSave = useCallback(
    async (updated: DevEnvironmentAnalysis) => {
      await updateDevEnvAnalysis(deployTarget.repositoryPath, {
        canStart: updated.canStart,
        reason: updated.reason,
        commands: updated.commands,
        ports: updated.ports,
        prerequisites: updated.prerequisites,
        environmentVariables: updated.environmentVariables,
        language: updated.language,
        framework: updated.framework,
      });
      setEditorOpen(false);
      // Re-load analysis to update summary
      await deployAction.reAnalyze();
    },
    [deployTarget.repositoryPath, deployAction]
  );

  const deployTooltip = isNotStartable
    ? (deployAction.analysisSummary?.reason ?? 'This repo cannot start a dev server')
    : isDeploymentActive
      ? 'Stop Dev Server'
      : 'Start Dev Server';

  return (
    <div data-testid="base-drawer-deploy-bar" className="flex flex-col gap-2 px-4 pb-3">
      {/* Mode toggle */}
      {deployAction.mode ? (
        <DeployModeToggle
          mode={deployAction.mode}
          autoDetectedMode={deployAction.mode}
          onModeChange={deployAction.setMode}
        />
      ) : null}

      {/* Deploy button row */}
      <div className="flex items-center gap-2">
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
            <TooltipContent>{deployTooltip}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Analyzing spinner */}
        {deployAction.analyzing ? (
          <span
            data-testid="deploy-analyzing-spinner"
            className="text-muted-foreground inline-flex items-center gap-1 text-xs"
          >
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing...
          </span>
        ) : null}

        {/* Deployment status badge (Booting/Ready) */}
        {isDeploymentActive ? (
          <DeploymentStatusBadge
            status={deployAction.status}
            url={deployAction.url}
            targetId={deployTarget.targetId}
          />
        ) : null}

        {/* NotStartable badge */}
        {isNotStartable ? (
          <DeploymentStatusBadge
            status={deployAction.status}
            reason={deployAction.analysisSummary?.reason}
          />
        ) : null}
      </div>

      {/* Cache summary */}
      {deployAction.analysisSummary && !deployAction.analyzing ? (
        <CacheSummary
          summary={deployAction.analysisSummary}
          onEdit={handleEdit}
          onReAnalyze={deployAction.reAnalyze}
          reAnalyzing={deployAction.analyzing}
        />
      ) : null}

      {/* Analysis editor dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Dev Environment Config</DialogTitle>
            <DialogDescription>Modify the analysis results for this repository.</DialogDescription>
          </DialogHeader>
          {fullAnalysis ? (
            <DevEnvAnalysisEditor
              analysis={fullAnalysis}
              onSave={handleSave}
              onCancel={() => setEditorOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

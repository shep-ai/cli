'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Trash2,
  ExternalLink,
  GitCommitHorizontal,
  Code2,
  Terminal,
  FolderOpen,
  Play,
  Square,
} from 'lucide-react';
import type {
  PrdApprovalPayload,
  QuestionSelectionChange,
} from '@shepai/core/domain/generated/output';
import { PrStatus } from '@shepai/core/domain/generated/output';
import { approveFeature } from '@/app/actions/approve-feature';
import { rejectFeature } from '@/app/actions/reject-feature';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { getResearchArtifact } from '@/app/actions/get-research-artifact';
import { getMergeReviewData } from '@/app/actions/get-merge-review-data';
import { cn } from '@/lib/utils';
import { featureFlags } from '@/lib/feature-flags';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CometSpinner } from '@/components/ui/comet-spinner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { CiStatusBadge } from '@/components/common/ci-status-badge';
import { ActionButton } from '@/components/common/action-button';
import { OpenActionMenu } from '@/components/common/open-action-menu';
import { FeatureCreateDrawer } from '@/components/common/feature-create-drawer';
import { PrdQuestionnaire } from '@/components/common/prd-questionnaire';
import { TechDecisionsReview } from '@/components/common/tech-decisions-review';
import { MergeReview } from '@/components/common/merge-review';
import { featureNodeStateConfig, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';
import { useRepositoryActions } from '@/components/common/repository-node/use-repository-actions';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { MergeReviewData } from '@/components/common/merge-review';
import type { FeatureCreatePayload } from '@/components/common/feature-create-drawer';
import type { DrawerView } from './drawer-view';

export interface ControlCenterDrawerProps {
  view: DrawerView | null;
  onClose: () => void;
  onDelete?: (featureId: string) => void;
  isDeleting?: boolean;
  onCreateSubmit: (data: FeatureCreatePayload) => void;
  isSubmitting?: boolean;
}

export function ControlCenterDrawer({
  view,
  onClose,
  onDelete,
  isDeleting,
  onCreateSubmit,
  isSubmitting,
}: ControlCenterDrawerProps) {
  // ── PRD questionnaire state ─────────────────────────────────────────────
  const [prdData, setPrdData] = useState<PrdQuestionnaireData | null>(null);
  const [prdSelections, setPrdSelections] = useState<Record<string, string>>({});
  const [isLoadingPrd, setIsLoadingPrd] = useState(false);

  // ── Tech decisions state ────────────────────────────────────────────────
  const [techData, setTechData] = useState<TechDecisionsReviewData | null>(null);
  const [isLoadingTech, setIsLoadingTech] = useState(false);

  // ── Merge review state ──────────────────────────────────────────────────
  const [mergeData, setMergeData] = useState<MergeReviewData | null>(null);
  const [isLoadingMerge, setIsLoadingMerge] = useState(false);

  // ── Shared reject state ─────────────────────────────────────────────────
  const [isRejecting, setIsRejecting] = useState(false);
  const rejectSound = useSoundAction('reject');

  // ── Data fetching ───────────────────────────────────────────────────────

  const prdFeatureId = view?.type === 'prd-review' ? view.node.featureId : null;
  useEffect(() => {
    setPrdSelections({});
    setPrdData(null);
    if (!prdFeatureId) return;

    let cancelled = false;
    setIsLoadingPrd(true);
    getFeatureArtifact(prdFeatureId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.questionnaire) {
          setPrdData(result.questionnaire);
          const defaults: Record<string, string> = {};
          for (const q of result.questionnaire.questions) {
            const recommended = q.options.find((o) => o.recommended);
            if (recommended) defaults[q.id] = recommended.id;
          }
          setPrdSelections(defaults);
        }
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load questionnaire');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPrd(false);
      });
    return () => {
      cancelled = true;
    };
  }, [prdFeatureId]);

  const techFeatureId = view?.type === 'tech-review' ? view.node.featureId : null;
  useEffect(() => {
    setTechData(null);
    if (!techFeatureId) return;

    let cancelled = false;
    setIsLoadingTech(true);
    getResearchArtifact(techFeatureId)
      .then((result) => {
        if (cancelled) return;
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.techDecisions) setTechData(result.techDecisions);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load tech decisions');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingTech(false);
      });
    return () => {
      cancelled = true;
    };
  }, [techFeatureId]);

  const mergeFeatureId = view?.type === 'merge-review' ? view.node.featureId : null;
  useEffect(() => {
    setMergeData(null);
    if (!mergeFeatureId) return;

    let cancelled = false;
    setIsLoadingMerge(true);
    getMergeReviewData(mergeFeatureId)
      .then((result) => {
        if (cancelled) return;
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        setMergeData(result);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load merge review data');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingMerge(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mergeFeatureId]);

  // ── Approve / reject handlers ───────────────────────────────────────────

  const reviewNode =
    view?.type === 'prd-review' || view?.type === 'tech-review' || view?.type === 'merge-review'
      ? view.node
      : null;

  const handleReject = useCallback(
    async (feedback: string, label: string, onDone?: () => void) => {
      if (!reviewNode?.featureId) return;
      setIsRejecting(true);
      try {
        const result = await rejectFeature(reviewNode.featureId, feedback);
        if (!result.rejected) {
          toast.error(result.error ?? `Failed to reject ${label.toLowerCase()}`);
          return;
        }
        rejectSound.play();
        toast.success(`${label} rejected — agent re-iterating (iteration ${result.iteration})`);
        if (result.iterationWarning) {
          toast.warning(
            `Iteration ${result.iteration} — consider approving or adjusting feedback to avoid excessive iterations`
          );
        }
        onClose();
        onDone?.();
      } finally {
        setIsRejecting(false);
      }
    },
    [reviewNode, onClose, rejectSound]
  );

  const handlePrdReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Requirements', () => setPrdSelections({})),
    [handleReject]
  );
  const handleTechReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Plan'),
    [handleReject]
  );
  const handleMergeReject = useCallback(
    (feedback: string) => handleReject(feedback, 'Merge'),
    [handleReject]
  );

  const handleSimpleApprove = useCallback(
    async (label: string) => {
      if (!reviewNode?.featureId) return;
      const result = await approveFeature(reviewNode.featureId);
      if (!result.approved) {
        toast.error(result.error ?? `Failed to approve ${label.toLowerCase()}`);
        return;
      }
      toast.success(`${label} approved — agent resuming`);
      onClose();
    },
    [reviewNode, onClose]
  );

  const handlePrdApprove = useCallback(
    async (_actionId: string) => {
      if (view?.type !== 'prd-review') return;
      let payload: PrdApprovalPayload | undefined;
      if (prdData) {
        const changedSelections: QuestionSelectionChange[] = [];
        for (const [questionId, optionId] of Object.entries(prdSelections)) {
          const question = prdData.questions.find((q) => q.id === questionId);
          const option = question?.options.find((o) => o.id === optionId);
          if (question && option) {
            changedSelections.push({ questionId: question.question, selectedOption: option.label });
          }
        }
        payload = { approved: true, changedSelections };
      }
      const result = await approveFeature(view.node.featureId, payload);
      if (!result.approved) {
        toast.error(result.error ?? 'Failed to approve requirements');
        return;
      }
      toast.success('Requirements approved — agent resuming');
      setPrdSelections({});
      onClose();
    },
    [view, prdData, prdSelections, onClose]
  );

  const handleTechApprove = useCallback(() => handleSimpleApprove('Plan'), [handleSimpleApprove]);
  const handleMergeApprove = useCallback(() => handleSimpleApprove('Merge'), [handleSimpleApprove]);

  // ── Derived view data ───────────────────────────────────────────────────

  const isCreateView = view?.type === 'feature-create';
  const createView = isCreateView ? view : null;

  const featureNode =
    view?.type === 'feature' ||
    view?.type === 'prd-review' ||
    view?.type === 'tech-review' ||
    view?.type === 'merge-review'
      ? view.node
      : null;

  const repoData = view?.type === 'repository' ? view.data : null;

  // ── Hooks (always called unconditionally per Rules of Hooks) ────────────

  const featureActionsInput =
    featureNode?.repositoryPath && featureNode?.branch
      ? {
          repositoryPath: featureNode.repositoryPath,
          branch: featureNode.branch,
          specPath: featureNode.specPath,
        }
      : null;
  const featureActions = useFeatureActions(featureActionsInput);
  const repoActions = useRepositoryActions(
    repoData?.repositoryPath ? { repositoryPath: repoData.repositoryPath } : null
  );

  // ── Deploy targets ──────────────────────────────────────────────────────
  // Feature deploy is rendered inline in the header; repo deploy uses BaseDrawer's bar.

  const featureDeployTarget =
    featureNode?.repositoryPath && featureNode.branch
      ? {
          targetId: featureNode.featureId,
          targetType: 'feature' as const,
          repositoryPath: featureNode.repositoryPath,
          branch: featureNode.branch,
        }
      : null;

  const repoDeployTarget = repoData?.repositoryPath
    ? {
        targetId: repoData.repositoryPath,
        targetType: 'repository' as const,
        repositoryPath: repoData.repositoryPath,
      }
    : undefined;

  const deployAction = useDeployAction(featureDeployTarget);
  const isFeatureDeployActive =
    deployAction.status === 'Booting' || deployAction.status === 'Ready';

  // ── Header ──────────────────────────────────────────────────────────────

  let header: React.ReactNode = undefined;

  if (featureNode) {
    header = (
      <>
        <div data-testid="feature-drawer-header">
          <DrawerTitle>{featureNode.name}</DrawerTitle>
          {featureNode.description ? (
            <DrawerDescription>{featureNode.description}</DrawerDescription>
          ) : featureNode.featureId ? (
            <DrawerDescription className="sr-only">{featureNode.featureId}</DrawerDescription>
          ) : null}
        </div>

        {featureActionsInput ? (
          <div className="flex items-center gap-2 pt-2">
            <OpenActionMenu
              actions={featureActions}
              repositoryPath={featureActionsInput.repositoryPath}
              showSpecs={!!featureActionsInput.specPath}
            />
            {featureFlags.envDeploy && featureDeployTarget ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <ActionButton
                          label={isFeatureDeployActive ? 'Stop Dev Server' : 'Start Dev Server'}
                          onClick={isFeatureDeployActive ? deployAction.stop : deployAction.deploy}
                          loading={deployAction.deployLoading || deployAction.stopLoading}
                          error={!!deployAction.deployError}
                          icon={isFeatureDeployActive ? Square : Play}
                          iconOnly
                          variant="outline"
                          size="icon-sm"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isFeatureDeployActive ? 'Stop Dev Server' : 'Start Dev Server'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {isFeatureDeployActive ? (
                  <DeploymentStatusBadge status={deployAction.status} url={deployAction.url} />
                ) : null}
              </>
            ) : null}
            {onDelete && featureNode.featureId ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete feature"
                    disabled={isDeleting}
                    className="text-muted-foreground hover:text-destructive ml-auto"
                    data-testid="feature-drawer-delete"
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete feature?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete <strong>{featureNode.name}</strong> (
                      {featureNode.featureId}). This action cannot be undone.
                      {featureNode.state === 'running' ? (
                        <> This feature has a running agent that will be stopped.</>
                      ) : null}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      disabled={isDeleting}
                      onClick={() => onDelete(featureNode.featureId)}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        'Delete'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
          </div>
        ) : null}
      </>
    );
  } else if (repoData) {
    header = (
      <div data-testid="repository-drawer-header">
        <DrawerTitle>{repoData.name}</DrawerTitle>
        {repoData.repositoryPath ? (
          <DrawerDescription className="truncate font-mono text-xs">
            {repoData.repositoryPath}
          </DrawerDescription>
        ) : null}
      </div>
    );
  }

  // ── Body ────────────────────────────────────────────────────────────────

  let body: React.ReactNode = null;

  if (view?.type === 'feature' && featureNode) {
    body = (
      <div className="flex-1 overflow-y-auto">
        <div data-testid="feature-drawer-status" className="flex flex-col gap-3 p-4">
          <div className="text-muted-foreground text-xs font-semibold tracking-wider">
            {lifecycleDisplayLabels[featureNode.lifecycle]}
          </div>
          <FeatureStateBadge data={featureNode} />
          {featureNode.progress > 0 ? (
            <div data-testid="feature-drawer-progress" className="flex flex-col gap-1">
              <div className="text-muted-foreground flex items-center justify-between text-xs">
                <span>Progress</span>
                <span>{featureNode.progress}%</span>
              </div>
              <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    featureNodeStateConfig[featureNode.state].progressClass
                  )}
                  style={{ width: `${featureNode.progress}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
        {featureNode.pr ? (
          <>
            <Separator />
            <FeaturePrInfo pr={featureNode.pr} />
          </>
        ) : null}
        <FeatureDetails data={featureNode} />
      </div>
    );
  } else if (view?.type === 'prd-review') {
    body = prdData ? (
      <PrdQuestionnaire
        data={prdData}
        selections={prdSelections}
        onSelect={(qId, oId) => setPrdSelections((prev) => ({ ...prev, [qId]: oId }))}
        onApprove={handlePrdApprove}
        onReject={handlePrdReject}
        isProcessing={isLoadingPrd}
        isRejecting={isRejecting}
      />
    ) : (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  } else if (view?.type === 'tech-review') {
    body = techData ? (
      <TechDecisionsReview
        data={techData}
        onApprove={handleTechApprove}
        onReject={handleTechReject}
        isProcessing={isLoadingTech}
        isRejecting={isRejecting}
      />
    ) : (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  } else if (view?.type === 'merge-review') {
    body = mergeData ? (
      <MergeReview
        data={mergeData}
        onApprove={handleMergeApprove}
        onReject={handleMergeReject}
        isProcessing={isLoadingMerge}
        isRejecting={isRejecting}
      />
    ) : (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  } else if (view?.type === 'repository' && repoData?.repositoryPath) {
    body = (
      <div className="flex-1 overflow-y-auto">
        <Separator />
        <div className="flex flex-col gap-3 p-4">
          <div className="text-muted-foreground text-xs font-semibold tracking-wider">
            OPEN WITH
          </div>
          <div className="flex flex-col gap-2">
            <ActionButton
              label="Open in IDE"
              onClick={repoActions.openInIde}
              loading={repoActions.ideLoading}
              error={!!repoActions.ideError}
              icon={Code2}
              variant="outline"
              size="sm"
            />
            <ActionButton
              label="Open in Shell"
              onClick={repoActions.openInShell}
              loading={repoActions.shellLoading}
              error={!!repoActions.shellError}
              icon={Terminal}
              variant="outline"
              size="sm"
            />
            <ActionButton
              label="Open Folder"
              onClick={repoActions.openFolder}
              loading={repoActions.folderLoading}
              error={!!repoActions.folderError}
              icon={FolderOpen}
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Single BaseDrawer for all node-selection views */}
      <BaseDrawer
        open={view !== null && !isCreateView}
        onClose={onClose}
        size="md"
        modal={false}
        header={header}
        deployTarget={repoDeployTarget}
        data-testid={
          view?.type === 'feature'
            ? 'feature-drawer'
            : view?.type === 'repository'
              ? 'repository-drawer'
              : 'review-drawer'
        }
      >
        {body}
      </BaseDrawer>

      {/* Feature create drawer — rendered as sibling since it owns its own complex form state */}
      <FeatureCreateDrawer
        open={isCreateView}
        onClose={onClose}
        onSubmit={onCreateSubmit}
        repositoryPath={createView?.repositoryPath ?? ''}
        features={createView?.features ?? []}
        workflowDefaults={createView?.workflowDefaults}
        initialParentId={createView?.initialParentId}
        isSubmitting={isSubmitting}
      />
    </>
  );
}

// ── Private sub-components ────────────────────────────────────────────────────

function FeatureStateBadge({ data }: { data: FeatureNodeData }) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        config.badgeBgClass,
        config.badgeClass
      )}
    >
      {data.state === 'running' ? (
        <CometSpinner size="sm" className="shrink-0" />
      ) : (
        <Icon className="h-4 w-4 shrink-0" />
      )}
      <span>{config.label}</span>
    </div>
  );
}

const prStatusStyles: Record<PrStatus, string> = {
  [PrStatus.Open]: 'border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50',
  [PrStatus.Merged]: 'border-transparent bg-purple-50 text-purple-700 hover:bg-purple-50',
  [PrStatus.Closed]: 'border-transparent bg-red-50 text-red-700 hover:bg-red-50',
};

function FeaturePrInfo({ pr }: { pr: NonNullable<FeatureNodeData['pr']> }) {
  return (
    <div data-testid="feature-drawer-pr" className="border-border mx-4 rounded-lg border">
      <div className="space-y-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <a
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary flex items-center gap-1.5 text-sm font-semibold underline underline-offset-2"
          >
            PR #{pr.number}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Badge className={prStatusStyles[pr.status]}>{pr.status}</Badge>
        </div>
        {pr.ciStatus ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">CI Status</span>
            <CiStatusBadge status={pr.ciStatus} />
          </div>
        ) : null}
        {pr.commitHash ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">Commit</span>
            <div className="flex items-center gap-1.5">
              <GitCommitHorizontal className="text-muted-foreground h-3.5 w-3.5" />
              <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
                {pr.commitHash.slice(0, 7)}
              </code>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeatureDetails({ data }: { data: FeatureNodeData }) {
  const hasAnyDetail = data.agentType ?? data.runtime ?? data.blockedBy ?? data.errorMessage;
  if (!hasAnyDetail) return null;
  return (
    <>
      <Separator />
      <div data-testid="feature-drawer-details" className="flex flex-col gap-3 p-4">
        {data.agentType ? <DetailRow label="Agent" value={data.agentType} /> : null}
        {data.runtime ? <DetailRow label="Runtime" value={data.runtime} /> : null}
        {data.blockedBy ? <DetailRow label="Blocked by" value={data.blockedBy} /> : null}
        {data.errorMessage ? <DetailRow label="Error" value={data.errorMessage} /> : null}
      </div>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}

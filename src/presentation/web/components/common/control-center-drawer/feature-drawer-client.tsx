'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2, Play, Square, Copy, Check, Code2, ExternalLink } from 'lucide-react';
import type {
  PrdApprovalPayload,
  QuestionSelectionChange,
} from '@shepai/core/domain/generated/output';
import { approveFeature } from '@/app/actions/approve-feature';
import { resumeFeature } from '@/app/actions/resume-feature';
import { startFeature } from '@/app/actions/start-feature';
import { rejectFeature } from '@/app/actions/reject-feature';
import type { RejectAttachment } from '@/components/common/drawer-action-bar';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { getResearchArtifact } from '@/app/actions/get-research-artifact';
import { getMergeReviewData } from '@/app/actions/get-merge-review-data';
import { useFeatureFlags } from '@/hooks/feature-flags-context';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useGuardedDrawerClose } from '@/hooks/drawer-close-guard';
import { useDeployAction } from '@/hooks/use-deploy-action';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';
import { BaseDrawer } from '@/components/common/base-drawer';
import { DeploymentStatusBadge } from '@/components/common/deployment-status-badge';
import { DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DeleteFeatureDialog } from '@/components/common/delete-feature-dialog';
import { ActionButton } from '@/components/common/action-button';
import { OpenActionMenu } from '@/components/common/open-action-menu';
import { FeatureDrawerTabs } from '@/components/common/feature-drawer-tabs';
import { useFeatureActions } from '@/components/common/feature-drawer/use-feature-actions';
import type { PrdQuestionnaireData } from '@/components/common/prd-questionnaire';
import type { TechDecisionsReviewData } from '@/components/common/tech-decisions-review';
import type { ProductDecisionsSummaryData } from '@/components/common/product-decisions-summary';
import type { MergeReviewData } from '@/components/common/merge-review';
import { resolveSseEventUpdates } from '@/components/common/feature-node/derive-feature-state';
import { deriveInitialTab } from './drawer-view';
import type { DrawerView, FeatureTabKey } from './drawer-view';
import { useArtifactFetch } from './use-artifact-fetch';
import { useDrawerSync } from './use-drawer-sync';
import { useBranchSyncStatus } from '@/hooks/use-branch-sync-status';

export interface FeatureDrawerClientProps {
  view: DrawerView;
  /** Tab key extracted from the URL path segment (e.g. /feature/[id]/activity → 'activity'). */
  urlTab?: FeatureTabKey;
}

export function FeatureDrawerClient({ view: initialView, urlTab }: FeatureDrawerClientProps) {
  const featureFlags = useFeatureFlags();
  const router = useRouter();
  const rejectSound = useSoundAction('reject');

  // Track the view locally so SSE events can update the drawer type in real-time
  const [view, setView] = useState(initialView);

  // Sync when server re-renders with new props (e.g. after navigation)
  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const featureNode = view.type === 'feature' ? view.node : null;

  // SSE: update drawer view when feature state changes
  const { events } = useAgentEventsContext();
  const processedCountRef = useRef(0);

  useEffect(() => {
    // Clamp cursor if events were pruned
    if (processedCountRef.current > events.length) {
      processedCountRef.current = 0;
    }
    if (!featureNode || events.length <= processedCountRef.current) return;

    const newEvents = events.slice(processedCountRef.current);
    processedCountRef.current = events.length;

    for (const update of resolveSseEventUpdates(newEvents)) {
      if (update.featureId !== featureNode.featureId) continue;

      // Skip SSE updates for features in 'deleting' state — prevents stale
      // events from overwriting the delete animation or triggering artifact
      // fetches (which would fail with "not found" for soft-deleted features).
      if (featureNode.state === 'deleting') continue;

      if (update.state !== undefined || update.lifecycle !== undefined) {
        // Update the node data AND re-derive the initial tab so the drawer
        // switches immediately (e.g. prd-review → overview when agent resumes).
        setView((prev) => {
          if (prev.type !== 'feature') return prev;
          const updatedNode = {
            ...prev.node,
            ...(update.state !== undefined && { state: update.state }),
            ...(update.lifecycle !== undefined && { lifecycle: update.lifecycle }),
          };
          return { ...prev, node: updatedNode, initialTab: deriveInitialTab(updatedNode) };
        });
      }
    }
  }, [events, featureNode]);

  // Derive open state from the URL. Next.js parallel routes preserve slot
  // content during soft navigation, so this component is NOT unmounted when
  // navigating to `/`. Instead, we watch the pathname and let Vaul handle
  // the close animation when the path no longer matches a feature route.
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/feature/');

  // Targeted data sync: fetches fresh FeatureNodeData on drawer open and
  // periodically while open. Replaces router.refresh() to avoid full-page
  // re-renders that cause visible flashing and can reset form state.
  useDrawerSync(isOpen, featureNode?.featureId ?? null, setView);

  const onClose = useCallback(() => {
    router.push('/');
  }, [router]);

  // ── Chat input state (shared across all review views) ────────────────
  const [chatInput, setChatInput] = useState('');

  // ── PRD state ──────────────────────────────────────────────────────────
  const [prdData, setPrdData] = useState<PrdQuestionnaireData | null>(null);
  const [prdSelections, setPrdSelections] = useState<Record<string, string>>({});
  const [prdDefaultSelections, setPrdDefaultSelections] = useState<Record<string, string>>({});

  // ── Tech state ─────────────────────────────────────────────────────────
  const [techData, setTechData] = useState<TechDecisionsReviewData | null>(null);

  // ── Product decisions state (for tech review Product tab) ─────────────
  const [techProductData, setTechProductData] = useState<
    ProductDecisionsSummaryData | null | undefined
  >(undefined);

  // ── Merge state ────────────────────────────────────────────────────────
  const [mergeData, setMergeData] = useState<MergeReviewData | null>(null);

  // ── Delete state ───────────────────────────────────────────────────────
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // ── Shared reject state ────────────────────────────────────────────────
  const [isRejecting, setIsRejecting] = useState(false);
  const isRejectingRef = useRef(false);

  // Reset chat input whenever the initialTab changes (lifecycle transition)
  const initialTab = view.type === 'feature' ? view.initialTab : undefined;
  useEffect(() => {
    setChatInput('');
  }, [initialTab]);

  // ── Artifact refresh key ─────────────────────────────────────────────
  // Increments whenever state or lifecycle changes (via SSE or background sync),
  // forcing useArtifactFetch to re-fetch even when the featureId stays the same.
  // This fixes race conditions where the first fetch fires too early (e.g. merge
  // data requested before the PR is created) and subsequent state updates don't
  // trigger a re-fetch because the featureId dep hasn't changed.
  const artifactRefreshKeyRef = useRef(0);
  const prevStateRef = useRef(featureNode?.state);
  const prevLifecycleRef = useRef(featureNode?.lifecycle);
  if (
    featureNode?.state !== prevStateRef.current ||
    featureNode?.lifecycle !== prevLifecycleRef.current
  ) {
    prevStateRef.current = featureNode?.state;
    prevLifecycleRef.current = featureNode?.lifecycle;
    artifactRefreshKeyRef.current += 1;
  }
  const artifactRefreshKey = artifactRefreshKeyRef.current;

  // ── Data fetching ─────────────────────────────────────────────────────

  const prdFeatureId =
    featureNode?.lifecycle === 'requirements' && featureNode?.state === 'action-required'
      ? featureNode.featureId
      : null;
  const isLoadingPrd = useArtifactFetch(
    prdFeatureId,
    getFeatureArtifact,
    (result) => {
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
        setPrdDefaultSelections(defaults);
      }
    },
    () => {
      setPrdSelections({});
      setPrdDefaultSelections({});
      setPrdData(null);
    },
    'Failed to load questionnaire',
    artifactRefreshKey
  );

  const techFeatureId =
    featureNode?.lifecycle === 'implementation' && featureNode?.state === 'action-required'
      ? featureNode.featureId
      : null;
  const isLoadingTech = useArtifactFetch(
    techFeatureId,
    getResearchArtifact,
    (result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.techDecisions) setTechData(result.techDecisions);
    },
    () => setTechData(null),
    'Failed to load tech decisions',
    artifactRefreshKey
  );

  const isLoadingTechProduct = useArtifactFetch(
    techFeatureId,
    getFeatureArtifact,
    (result) => {
      if (result.productDecisions) setTechProductData(result.productDecisions);
    },
    () => setTechProductData(undefined),
    undefined,
    artifactRefreshKey
  );

  const mergeFeatureId =
    (featureNode?.lifecycle === 'review' &&
      (featureNode?.state === 'action-required' || featureNode?.state === 'error')) ||
    (featureNode?.lifecycle === 'maintain' && featureNode?.pr)
      ? featureNode.featureId
      : null;
  const isLoadingMerge = useArtifactFetch(
    mergeFeatureId,
    getMergeReviewData,
    (result) => {
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      setMergeData(result);
    },
    () => setMergeData(null),
    'Failed to load merge review data',
    artifactRefreshKey
  );

  // ── Close guard ──────────────────────────────────────────────────────
  const isChatDirty = chatInput.trim().length > 0;
  const isPrdDirty =
    featureNode?.lifecycle === 'requirements' &&
    featureNode?.state === 'action-required' &&
    Object.keys(prdDefaultSelections).some((k) => prdDefaultSelections[k] !== prdSelections[k]);
  const isDirty = isChatDirty || isPrdDirty;

  const onReset = useCallback(() => {
    setChatInput('');
    setPrdSelections({ ...prdDefaultSelections });
  }, [prdDefaultSelections]);

  const { attemptClose } = useGuardedDrawerClose({ open: isOpen, isDirty, onClose, onReset });

  // ── Approve / reject handlers ─────────────────────────────────────────

  const handleReject = useCallback(
    async (
      feedback: string,
      label: string,
      attachments: RejectAttachment[] = [],
      onDone?: () => void
    ) => {
      if (!featureNode?.featureId) return;
      isRejectingRef.current = true;
      setIsRejecting(true);
      try {
        const attachmentPaths = attachments.map((a) => a.path).filter(Boolean);
        const result = await rejectFeature(featureNode.featureId, feedback, attachmentPaths);
        if (!result.rejected) {
          toast.error(result.error ?? `Failed to reject ${label.toLowerCase()}`);
          return;
        }
        rejectSound.play();
        setChatInput('');
        toast.success(`${label} rejected — agent re-iterating (iteration ${result.iteration})`);
        if (result.iterationWarning) {
          toast.warning(
            `Iteration ${result.iteration} — consider approving or adjusting feedback to avoid excessive iterations`
          );
        }
        // Optimistically update canvas node before SSE arrives (~500ms delay)
        window.dispatchEvent(
          new CustomEvent('shep:feature-approved', {
            detail: { featureId: featureNode.featureId },
          })
        );
        onClose();
        onDone?.();
      } finally {
        isRejectingRef.current = false;
        setIsRejecting(false);
      }
    },
    [featureNode, onClose, rejectSound]
  );

  const handlePrdReject = useCallback(
    (feedback: string, attachments: RejectAttachment[]) =>
      handleReject(feedback, 'Requirements', attachments, () => setPrdSelections({})),
    [handleReject]
  );
  const handleTechReject = useCallback(
    (feedback: string, attachments: RejectAttachment[]) =>
      handleReject(feedback, 'Plan', attachments),
    [handleReject]
  );
  const handleMergeReject = useCallback(
    (feedback: string, attachments: RejectAttachment[]) =>
      handleReject(feedback, 'Merge', attachments),
    [handleReject]
  );

  const handleSimpleApprove = useCallback(
    async (label: string) => {
      if (!featureNode?.featureId) return;
      const result = await approveFeature(featureNode.featureId);
      if (!result.approved) {
        toast.error(result.error ?? `Failed to approve ${label.toLowerCase()}`);
        return;
      }
      setChatInput('');
      toast.success(`${label} approved — agent resuming`);
      // Optimistically update canvas node before SSE arrives (~500ms delay)
      window.dispatchEvent(
        new CustomEvent('shep:feature-approved', {
          detail: { featureId: featureNode.featureId },
        })
      );
      onClose();
    },
    [featureNode, onClose]
  );

  const handlePrdApprove = useCallback(
    async (_actionId: string) => {
      if (view.type !== 'feature' || !featureNode) return;
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
      const result = await approveFeature(featureNode.featureId, payload);
      if (!result.approved) {
        toast.error(result.error ?? 'Failed to approve requirements');
        return;
      }
      setChatInput('');
      toast.success('Requirements approved — agent resuming');
      // Optimistically update canvas node before SSE arrives (~500ms delay)
      window.dispatchEvent(
        new CustomEvent('shep:feature-approved', {
          detail: { featureId: featureNode.featureId },
        })
      );
      setPrdSelections({});
      onClose();
    },
    [view, featureNode, prdData, prdSelections, onClose]
  );

  const handleTechApprove = useCallback(() => handleSimpleApprove('Plan'), [handleSimpleApprove]);
  const handleMergeApprove = useCallback(() => handleSimpleApprove('Merge'), [handleSimpleApprove]);

  const handleDelete = useCallback(
    async (featureId: string, cleanup?: boolean, cascadeDelete?: boolean, closePr?: boolean) => {
      setIsDeleting(true);
      // Close the delete dialog and drawer before the server action so the
      // user sees immediate feedback. We dispatch a DOM event so the canvas
      // control center can run its own optimistic delete flow (deleting state,
      // mutation guard, node removal) in parallel.
      setDeleteDialogOpen(false);
      window.dispatchEvent(
        new CustomEvent('shep:feature-delete-requested', {
          detail: { featureId, cleanup, cascadeDelete, closePr },
        })
      );
      router.push('/');
    },
    [router]
  );

  const handleRetry = useCallback(async (featureId: string) => {
    const result = await resumeFeature(featureId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Feature resumed — agent restarting');
    // Optimistically update canvas node
    window.dispatchEvent(
      new CustomEvent('shep:feature-approved', {
        detail: { featureId },
      })
    );
    // Optimistically update the drawer view
    setView((prev) => {
      if (prev.type !== 'feature') return prev;
      return { ...prev, node: { ...prev.node, state: 'running' } };
    });
  }, []);

  const handleStart = useCallback(async (featureId: string) => {
    const result = await startFeature(featureId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Feature started');
    // Optimistically update the drawer view
    setView((prev) => {
      if (prev.type !== 'feature') return prev;
      return { ...prev, node: { ...prev.node, state: 'running' } };
    });
  }, []);

  // ── Hooks (always called unconditionally per Rules of Hooks) ──────────

  const featureActionsInput =
    featureNode?.repositoryPath && featureNode?.branch
      ? {
          featureId: featureNode.featureId,
          repositoryPath: featureNode.repositoryPath,
          branch: featureNode.branch,
          worktreePath: featureNode.worktreePath,
          specPath: featureNode.specPath,
        }
      : null;
  const featureActions = useFeatureActions(featureActionsInput);

  // Branch sync status — only when the feature flag is on and the feature has a branch
  const syncFeatureId =
    featureFlags.gitRebaseSync && featureNode?.branch ? featureNode.featureId : null;
  const {
    data: syncData,
    loading: syncLoading,
    error: syncError,
    refresh: refreshSync,
  } = useBranchSyncStatus(syncFeatureId);

  // Auto-refresh sync status after a successful rebase
  const prevRebaseLoadingRef = useRef(featureActions.rebaseLoading);
  useEffect(() => {
    if (
      prevRebaseLoadingRef.current &&
      !featureActions.rebaseLoading &&
      !featureActions.rebaseError
    ) {
      refreshSync();
    }
    prevRebaseLoadingRef.current = featureActions.rebaseLoading;
  }, [featureActions.rebaseLoading, featureActions.rebaseError, refreshSync]);

  const featureDeployTarget =
    featureNode?.repositoryPath && featureNode.branch
      ? {
          targetId: featureNode.featureId,
          targetType: 'feature' as const,
          repositoryPath: featureNode.repositoryPath,
          branch: featureNode.branch,
        }
      : null;

  const deployAction = useDeployAction(featureDeployTarget);
  const isFeatureDeployActive =
    deployAction.status === 'Booting' || deployAction.status === 'Ready';

  // ── Short ID copy ───────────────────────────────────────────────────
  const COPY_FEEDBACK_DELAY = 2000;
  const [idCopied, setIdCopied] = useState(false);
  const handleCopyId = useCallback(() => {
    if (!featureNode?.featureId) return;
    void navigator.clipboard.writeText(featureNode.featureId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), COPY_FEEDBACK_DELAY);
  }, [featureNode?.featureId]);

  // ── Header ────────────────────────────────────────────────────────────

  let header: React.ReactNode = undefined;

  if (featureNode) {
    const shortId = featureNode.featureId.slice(0, 8);
    const repoName =
      featureNode.repositoryName ??
      featureNode.repositoryPath.split('/').filter(Boolean).at(-1) ??
      '';
    header = (
      <>
        <div data-testid="feature-drawer-header">
          <DrawerTitle>{featureNode.name}</DrawerTitle>
          {repoName ? (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Code2 className="text-muted-foreground size-3.5 shrink-0" />
              {featureNode.remoteUrl ? (
                <a
                  href={featureNode.remoteUrl as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
                  data-testid="feature-drawer-repo-link"
                >
                  {repoName}
                  <ExternalLink className="size-3" />
                </a>
              ) : (
                <span className="text-muted-foreground text-xs">{repoName}</span>
              )}
            </div>
          ) : null}
          <DrawerDescription className="sr-only">{featureNode.name}</DrawerDescription>
        </div>

        {featureActionsInput ? (
          <div className="flex items-center gap-2 pt-2" data-testid="feature-drawer-actions">
            <OpenActionMenu
              actions={featureActions}
              repositoryPath={featureActionsInput.repositoryPath}
              worktreePath={featureActionsInput.worktreePath}
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
                  <DeploymentStatusBadge
                    status={deployAction.status}
                    url={deployAction.url}
                    targetId={featureDeployTarget?.targetId}
                  />
                ) : null}
              </>
            ) : null}
            <div className="ml-auto flex items-center gap-1.5">
              <code className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-xs">
                {shortId}
              </code>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-muted-foreground hover:text-foreground inline-flex items-center rounded p-0.5 transition-colors"
                aria-label="Copy feature ID"
                data-testid="feature-drawer-copy-id"
              >
                {idCopied ? (
                  <Check className="size-3.5 text-green-600" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </div>
            {featureNode.featureId ? (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete feature"
                  disabled={isDeleting}
                  className="text-muted-foreground hover:text-destructive"
                  data-testid="feature-drawer-delete"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  {isDeleting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
                <DeleteFeatureDialog
                  open={deleteDialogOpen}
                  onOpenChange={setDeleteDialogOpen}
                  onConfirm={(cleanup, cascadeDelete, closePr) =>
                    handleDelete(featureNode.featureId, cleanup, cascadeDelete, closePr)
                  }
                  isDeleting={isDeleting}
                  featureName={featureNode.name}
                  featureId={featureNode.featureId}
                  hasChildren={featureNode.hasChildren}
                  hasOpenPr={!!featureNode.pr && featureNode.pr.status === 'Open'}
                />
              </>
            ) : null}
          </div>
        ) : null}
      </>
    );
  }

  // ── Body ──────────────────────────────────────────────────────────────

  let body: React.ReactNode = null;

  if (view.type === 'feature' && featureNode) {
    const enrichedNode = {
      ...featureNode,
      ...(featureNode.state === 'error' && { onRetry: handleRetry }),
      ...(featureNode.state === 'pending' && { onStart: handleStart }),
    };
    body = (
      <FeatureDrawerTabs
        featureNode={enrichedNode}
        featureId={featureNode.featureId}
        initialTab={view.initialTab}
        urlTab={urlTab}
        sseEvents={events}
        prdData={prdData}
        prdSelections={prdSelections}
        onPrdSelect={(qId, oId) => setPrdSelections((prev) => ({ ...prev, [qId]: oId }))}
        onPrdApprove={handlePrdApprove}
        onPrdReject={handlePrdReject}
        isPrdLoading={isLoadingPrd}
        techData={techData}
        onTechApprove={handleTechApprove}
        onTechReject={handleTechReject}
        isTechLoading={isLoadingTech}
        productData={isLoadingTechProduct ? null : techProductData}
        mergeData={mergeData}
        onMergeApprove={handleMergeApprove}
        onMergeReject={handleMergeReject}
        isMergeLoading={isLoadingMerge}
        syncStatus={featureFlags.gitRebaseSync ? syncData : undefined}
        syncLoading={syncLoading}
        syncError={syncError}
        onRefreshSync={featureFlags.gitRebaseSync ? refreshSync : undefined}
        onRebaseOnMain={featureFlags.gitRebaseSync ? featureActions.rebaseOnMain : undefined}
        rebaseLoading={featureActions.rebaseLoading}
        rebaseError={featureActions.rebaseError}
        isRejecting={isRejecting}
        chatInput={chatInput}
        onChatInputChange={setChatInput}
      />
    );
  }

  return (
    <BaseDrawer
      open={isOpen}
      onClose={attemptClose}
      size="md"
      modal={false}
      header={header}
      data-testid={view.type === 'feature' ? 'feature-drawer' : 'repository-drawer'}
    >
      {body}
    </BaseDrawer>
  );
}

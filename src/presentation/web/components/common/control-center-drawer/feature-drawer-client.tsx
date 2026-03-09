'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Trash2, Play, Square, Copy, Check, Code2 } from 'lucide-react';
import type {
  PrdApprovalPayload,
  QuestionSelectionChange,
} from '@shepai/core/domain/generated/output';
import { approveFeature } from '@/app/actions/approve-feature';
import { rejectFeature } from '@/app/actions/reject-feature';
import { getFeatureArtifact } from '@/app/actions/get-feature-artifact';
import { getResearchArtifact } from '@/app/actions/get-research-artifact';
import { getMergeReviewData } from '@/app/actions/get-merge-review-data';
import { deleteFeature } from '@/app/actions/delete-feature';
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
import type { DrawerView } from './drawer-view';
import { useArtifactFetch } from './use-artifact-fetch';

export interface FeatureDrawerClientProps {
  view: DrawerView;
}

export function FeatureDrawerClient({ view: initialView }: FeatureDrawerClientProps) {
  const featureFlags = useFeatureFlags();
  const router = useRouter();
  const deleteSound = useSoundAction('delete');
  const rejectSound = useSoundAction('reject');

  // Track the view locally so SSE events can update the drawer type in real-time
  const [view, setView] = useState(initialView);

  // Sync when server re-renders with new props (e.g. after router.refresh())
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

      // Trigger a server refresh to get the latest drawer view,
      // but skip when the drawer is closed, the user has unsaved changes,
      // or a rejection is in-flight to avoid unnecessary refreshes.
      if (isOpenRef.current && !isDirtyRef.current && !isRejectingRef.current) router.refresh();

      if (update.state !== undefined || update.lifecycle !== undefined) {
        // Optimistically update the node data AND re-derive the initial tab so the
        // drawer switches immediately (e.g. prd-review → overview when agent resumes)
        // without waiting for the router.refresh() round-trip.
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
  }, [events, featureNode, router]);

  // Derive open state from the URL. Next.js parallel routes preserve slot
  // content during soft navigation, so this component is NOT unmounted when
  // navigating to `/`. Instead, we watch the pathname and let Vaul handle
  // the close animation when the path no longer matches a feature route.
  const pathname = usePathname();
  const isOpen = pathname.startsWith('/feature/');
  const isOpenRef = useRef(isOpen);
  const wasOpenRef = useRef(isOpen);

  // When the drawer re-opens, force a server refresh so the view is always fresh.
  // SSE skips router.refresh() while the drawer is closed, so data can go stale.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      router.refresh();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, router]);

  isOpenRef.current = isOpen;

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

  // ── Shared reject state ────────────────────────────────────────────────
  const [isRejecting, setIsRejecting] = useState(false);
  const isRejectingRef = useRef(false);

  // Reset chat input whenever the initialTab changes (lifecycle transition)
  const initialTab = view.type === 'feature' ? view.initialTab : undefined;
  useEffect(() => {
    setChatInput('');
  }, [initialTab]);

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
    'Failed to load questionnaire'
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
    'Failed to load tech decisions'
  );

  const isLoadingTechProduct = useArtifactFetch(
    techFeatureId,
    getFeatureArtifact,
    (result) => {
      if (result.productDecisions) setTechProductData(result.productDecisions);
    },
    () => setTechProductData(undefined)
  );

  const mergeFeatureId =
    featureNode?.lifecycle === 'review' &&
    (featureNode?.state === 'action-required' || featureNode?.state === 'error')
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
    'Failed to load merge review data'
  );

  // ── Close guard ──────────────────────────────────────────────────────
  const isChatDirty = chatInput.trim().length > 0;
  const isPrdDirty =
    featureNode?.lifecycle === 'requirements' &&
    featureNode?.state === 'action-required' &&
    Object.keys(prdDefaultSelections).some((k) => prdDefaultSelections[k] !== prdSelections[k]);
  const isDirty = isChatDirty || isPrdDirty;

  // Keep dirty state in a ref so the SSE handler can read the latest value
  // without re-running the effect on every keystroke.
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  const onReset = useCallback(() => {
    setChatInput('');
    setPrdSelections({ ...prdDefaultSelections });
  }, [prdDefaultSelections]);

  const { attemptClose } = useGuardedDrawerClose({ open: isOpen, isDirty, onClose, onReset });

  // ── Approve / reject handlers ─────────────────────────────────────────

  const handleReject = useCallback(
    async (feedback: string, label: string, onDone?: () => void) => {
      if (!featureNode?.featureId) return;
      isRejectingRef.current = true;
      setIsRejecting(true);
      try {
        const result = await rejectFeature(featureNode.featureId, feedback);
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
    async (featureId: string) => {
      setIsDeleting(true);
      try {
        const result = await deleteFeature(featureId);
        if (result.error) {
          toast.error(result.error);
          return;
        }
        deleteSound.play();
        toast.success('Feature deleted successfully');
        router.push('/');
        router.refresh();
      } catch {
        toast.error('Failed to delete feature');
      } finally {
        setIsDeleting(false);
      }
    },
    [router, deleteSound]
  );

  // ── Hooks (always called unconditionally per Rules of Hooks) ──────────

  const featureActionsInput =
    featureNode?.repositoryPath && featureNode?.branch
      ? {
          repositoryPath: featureNode.repositoryPath,
          branch: featureNode.branch,
          specPath: featureNode.specPath,
        }
      : null;
  const featureActions = useFeatureActions(featureActionsInput);

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
              <span className="text-muted-foreground text-xs">{repoName}</span>
            </div>
          ) : null}
          {featureNode.oneLiner ? (
            <DrawerDescription>{featureNode.oneLiner}</DrawerDescription>
          ) : featureNode.userQuery ? (
            <DrawerDescription>{featureNode.userQuery}</DrawerDescription>
          ) : featureNode.description ? (
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
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete feature"
                    disabled={isDeleting}
                    className="text-muted-foreground hover:text-destructive"
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
                      onClick={() => handleDelete(featureNode.featureId)}
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
  }

  // ── Body ──────────────────────────────────────────────────────────────

  let body: React.ReactNode = null;

  if (view.type === 'feature' && featureNode) {
    body = (
      <FeatureDrawerTabs
        featureNode={featureNode}
        featureId={featureNode.featureId}
        initialTab={view.initialTab}
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

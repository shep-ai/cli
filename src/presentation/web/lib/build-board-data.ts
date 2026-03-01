import { SdlcLifecycle } from '@shepai/core/domain/generated';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';
import {
  deriveNodeState,
  deriveProgress,
} from '@/components/common/feature-node/derive-feature-state';
import type { FeatureWithRun } from '@/app/build-graph-nodes';

export type BoardColumnId = 'backlog' | 'requirements' | 'implementation' | 'review' | 'done';

export interface BoardColumn {
  id: BoardColumnId;
  label: string;
  lifecycles: SdlcLifecycle[];
}

export const BOARD_COLUMNS: BoardColumn[] = [
  { id: 'backlog', label: 'Backlog', lifecycles: [SdlcLifecycle.Started] },
  {
    id: 'requirements',
    label: 'Requirements',
    lifecycles: [SdlcLifecycle.Analyze, SdlcLifecycle.Requirements, SdlcLifecycle.Research],
  },
  {
    id: 'implementation',
    label: 'Implementation',
    lifecycles: [SdlcLifecycle.Planning, SdlcLifecycle.Implementation],
  },
  { id: 'review', label: 'Review', lifecycles: [SdlcLifecycle.Review] },
  { id: 'done', label: 'Done', lifecycles: [SdlcLifecycle.Maintain] },
];

/** Reverse lookup: SdlcLifecycle value → BoardColumnId. */
const sdlcToColumn: Record<string, BoardColumnId> = {};
for (const col of BOARD_COLUMNS) {
  for (const lc of col.lifecycles) {
    sdlcToColumn[lc] = col.id;
  }
}

/** Map SdlcLifecycle enum value to its board column. Falls back to 'backlog' for Blocked or unknown values. */
export function lifecycleToColumnId(lifecycle: SdlcLifecycle): BoardColumnId {
  return sdlcToColumn[lifecycle] ?? 'backlog';
}

/** Map domain SdlcLifecycle to UI FeatureLifecyclePhase (mirrors build-graph-nodes.ts lifecycleMap). */
const lifecyclePhaseMap: Record<string, FeatureLifecyclePhase> = {
  Requirements: 'requirements',
  Research: 'research',
  Implementation: 'implementation',
  Review: 'review',
  'Deploy & QA': 'deploy',
  Maintain: 'maintain',
};

/** Map agent graph node names to UI lifecycle phases (mirrors build-graph-nodes.ts nodeToLifecyclePhase). */
const nodeToLifecyclePhase: Record<string, FeatureLifecyclePhase> = {
  analyze: 'requirements',
  requirements: 'requirements',
  research: 'research',
  plan: 'implementation',
  implement: 'implementation',
  merge: 'review',
};

/**
 * Groups FeatureWithRun[] into board columns, deriving FeatureNodeData for each feature.
 *
 * Blocked features appear in their fallback column (backlog) with the blockedBy field populated.
 * Returns a Map with all 5 column ids, even when some columns are empty.
 */
export function buildBoardData(
  featuresWithRuns: FeatureWithRun[]
): Map<BoardColumnId, FeatureNodeData[]> {
  const result = new Map<BoardColumnId, FeatureNodeData[]>();
  for (const col of BOARD_COLUMNS) {
    result.set(col.id, []);
  }

  for (const { feature, run } of featuresWithRuns) {
    const columnId = lifecycleToColumnId(feature.lifecycle);

    // Derive lifecycle phase (same logic as build-graph-nodes.ts appendFeatureNodes)
    const agentNode = run?.result?.startsWith('node:') ? run.result.slice(5) : undefined;
    const lifecycle: FeatureLifecyclePhase =
      run?.status === 'completed'
        ? 'maintain'
        : ((agentNode ? nodeToLifecyclePhase[agentNode] : undefined) ??
          lifecyclePhaseMap[feature.lifecycle] ??
          'requirements');

    // Resolve blockedBy display name from parent feature
    let blockedBy: string | undefined;
    if (feature.parentId && feature.lifecycle === SdlcLifecycle.Blocked) {
      const parentEntry = featuresWithRuns.find((e) => e.feature.id === feature.parentId);
      if (parentEntry) {
        blockedBy = parentEntry.feature.name;
      }
    }

    const nodeData: FeatureNodeData = {
      name: feature.name,
      description: feature.description ?? feature.slug,
      featureId: feature.id,
      lifecycle,
      repositoryPath: feature.repositoryPath,
      branch: feature.branch,
      specPath: feature.specPath,
      state: deriveNodeState(feature, run),
      progress: deriveProgress(feature),
      ...(run?.agentType && { agentType: run.agentType as FeatureNodeData['agentType'] }),
      ...(run?.error && { errorMessage: run.error }),
      ...(blockedBy && { blockedBy }),
      ...(feature.pr && {
        pr: {
          url: feature.pr.url,
          number: feature.pr.number,
          status: feature.pr.status,
          ciStatus: feature.pr.ciStatus,
          commitHash: feature.pr.commitHash,
        },
      }),
    };

    result.get(columnId)!.push(nodeData);
  }

  return result;
}

'use client';

import { SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ElapsedTime } from '@/components/common/elapsed-time';
import { featureStatusConfig } from '@/components/common/feature-status-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';
import {
  getAgentTypeIcon,
  agentTypeLabels,
  type AgentTypeValue,
} from '@/components/common/feature-node/agent-type-icons';
import { getModelMeta } from '@/lib/model-metadata';

export interface FeatureListItemProps {
  name: string;
  status: FeatureStatus;
  startedAt?: number;
  duration?: string;
  agentType?: string;
  modelId?: string;
  onClick?: () => void;
}

export function FeatureListItem({
  name,
  status,
  startedAt,
  duration,
  agentType,
  modelId,
  onClick,
}: FeatureListItemProps) {
  const { icon: StatusIcon, iconClass } = featureStatusConfig[status];
  const AgentIcon = agentType ? getAgentTypeIcon(agentType) : null;

  return (
    <SidebarMenuItem data-testid="feature-list-item">
      <SidebarMenuButton size="sm" onClick={onClick} tooltip={name} className="cursor-pointer">
        <StatusIcon className={iconClass} />
        <span className="flex-1 truncate font-medium">{name}</span>
        {status === 'in-progress' && startedAt != null ? (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            <ElapsedTime startedAt={startedAt} />
          </span>
        ) : null}
        {status === 'done' && duration ? (
          <span
            data-testid="feature-list-item-meta"
            className="text-muted-foreground ml-auto text-xs tabular-nums"
          >
            {duration}
          </span>
        ) : null}
        {AgentIcon ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="ml-auto shrink-0">
                  <AgentIcon className="h-3.5 w-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="font-medium">
                  {agentTypeLabels[agentType as AgentTypeValue] ?? agentType}
                </span>
                {modelId ? (
                  <span className="ms-1 opacity-70">
                    · {getModelMeta(modelId).displayName || modelId}
                  </span>
                ) : null}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

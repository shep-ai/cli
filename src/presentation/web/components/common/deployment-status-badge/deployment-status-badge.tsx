'use client';

import { useState } from 'react';
import { Loader2, ExternalLink, Terminal } from 'lucide-react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { ServerLogViewer } from '@/components/common/server-log-viewer';

export interface DeploymentStatusBadgeProps {
  status: DeploymentState | null;
  url?: string | null;
  targetId?: string;
}

export function DeploymentStatusBadge({ status, url, targetId }: DeploymentStatusBadgeProps) {
  const [logViewerOpen, setLogViewerOpen] = useState(false);
  const showLogButton =
    targetId && (status === DeploymentState.Booting || status === DeploymentState.Ready);

  switch (status) {
    case DeploymentState.Booting:
      return (
        <>
          <Badge className="border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50">
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            Starting...
            {showLogButton ? (
              <button
                type="button"
                aria-label="View server logs"
                className="ml-1.5 inline-flex items-center rounded-sm p-0.5 hover:bg-blue-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setLogViewerOpen(true);
                }}
              >
                <Terminal className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
          {showLogButton ? (
            <ServerLogViewer
              open={logViewerOpen}
              onOpenChange={setLogViewerOpen}
              targetId={targetId}
            />
          ) : null}
        </>
      );
    case DeploymentState.Ready:
      return (
        <>
          <Badge className="border-transparent bg-green-50 text-green-700 hover:bg-green-50">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {url}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              'Ready'
            )}
            {showLogButton ? (
              <button
                type="button"
                aria-label="View server logs"
                className="ml-1.5 inline-flex items-center rounded-sm p-0.5 hover:bg-green-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setLogViewerOpen(true);
                }}
              >
                <Terminal className="h-3 w-3" />
              </button>
            ) : null}
          </Badge>
          {showLogButton ? (
            <ServerLogViewer
              open={logViewerOpen}
              onOpenChange={setLogViewerOpen}
              targetId={targetId}
            />
          ) : null}
        </>
      );
    default:
      return null;
  }
}

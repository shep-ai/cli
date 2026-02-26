import { Loader2, ExternalLink } from 'lucide-react';
import { DeploymentState } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';

export interface DeploymentStatusBadgeProps {
  status: DeploymentState | null;
  url?: string | null;
}

export function DeploymentStatusBadge({ status, url }: DeploymentStatusBadgeProps) {
  switch (status) {
    case DeploymentState.Booting:
      return (
        <Badge className="border-transparent bg-blue-50 text-blue-700 hover:bg-blue-50">
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          Starting...
        </Badge>
      );
    case DeploymentState.Ready:
      return (
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
        </Badge>
      );
    default:
      return null;
  }
}

import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { CiStatus } from '@shepai/core/domain/generated/output';
import { Badge } from '@/components/ui/badge';

export function CiStatusBadge({ status }: { status: CiStatus }) {
  switch (status) {
    case CiStatus.Success:
      return (
        <Badge className="border-transparent bg-green-50 text-green-700 hover:bg-green-50">
          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
          Passing
        </Badge>
      );
    case CiStatus.Pending:
      return (
        <Badge className="border-transparent bg-yellow-50 text-yellow-700 hover:bg-yellow-50">
          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          Pending
        </Badge>
      );
    case CiStatus.Failure:
      return (
        <Badge className="border-transparent bg-red-50 text-red-700 hover:bg-red-50">
          <XCircle className="mr-1 h-3.5 w-3.5" />
          Failing
        </Badge>
      );
  }
}

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import type { LogEntry } from '@/domain/generated/output';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface LogsTableProps {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  onPageChange: (newOffset: number) => void;
}

function getLevelBadgeVariant(level: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (level.toLowerCase()) {
    case 'error':
      return 'destructive';
    case 'warn':
      return 'outline';
    case 'info':
      return 'secondary';
    case 'debug':
      return 'default';
    default:
      return 'default';
  }
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function LogsTable({ logs, total, limit, offset, onPageChange }: LogsTableProps) {
  const router = useRouter();

  const handleRowClick = (logId: string) => {
    router.push(`/logs/${logId}`);
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">
                No logs found
              </TableCell>
            </TableRow>
          ) : (
            logs.map((log) => (
              <TableRow
                key={log.id}
                onClick={() => handleRowClick(log.id)}
                className="cursor-pointer"
              >
                <TableCell className="font-mono text-xs">
                  {formatTimestamp(log.timestamp)}
                </TableCell>
                <TableCell>
                  <Badge variant={getLevelBadgeVariant(log.level)} data-testid="log-level">
                    {log.level}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">{log.source}</TableCell>
                <TableCell className="max-w-md truncate">{log.message}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between">
        <div className="text-muted-foreground text-sm">
          Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} logs
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(offset - limit)}
            disabled={!hasPrevPage}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(offset + limit)}
            disabled={!hasNextPage}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import type { LogEntry } from '@/domain/generated/output';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface LogDetailProps {
  log: LogEntry;
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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
}

export function LogDetail({ log }: LogDetailProps) {
  return (
    <div className="space-y-6">
      {/* Metadata Card */}
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="text-muted-foreground mb-1 text-sm font-medium">Level</div>
              <Badge variant={getLevelBadgeVariant(log.level)} className="text-sm">
                {log.level}
              </Badge>
            </div>

            <div>
              <div className="text-muted-foreground mb-1 text-sm font-medium">Source</div>
              <div className="font-mono text-sm">{log.source}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-muted-foreground mb-1 text-sm font-medium">Timestamp</div>
              <div className="text-sm">{formatTimestamp(log.timestamp)}</div>
            </div>

            <div className="md:col-span-2">
              <div className="text-muted-foreground mb-1 text-sm font-medium">Log ID</div>
              <div className="text-muted-foreground font-mono text-sm">{log.id}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Card */}
      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-4">
            <pre className="font-mono text-sm whitespace-pre-wrap">{log.message}</pre>
          </div>
        </CardContent>
      </Card>

      {/* Context Card (if present) */}
      {log.context && Object.keys(log.context).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Context</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4">
              <pre className="font-mono text-sm whitespace-pre-wrap">
                {JSON.stringify(log.context, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stack Trace Card (if present) */}
      {log.stackTrace && (
        <Card>
          <CardHeader>
            <CardTitle>Stack Trace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-md p-4">
              <pre className="font-mono text-xs whitespace-pre-wrap">{log.stackTrace}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

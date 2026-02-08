'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { LogEntry } from '@/domain/generated/output';
import { LogDetail } from '@/components/logs/log-detail';
import { Button } from '@/components/ui/button';

export default function LogDetailPage() {
  const params = useParams();
  const logId = params.id as string;

  const [log, setLog] = useState<LogEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLog() {
      if (!logId) {
        setError('No log ID provided');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/logs/${logId}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('Log entry not found');
          } else {
            setError(`Failed to fetch log: ${response.statusText}`);
          }
          setIsLoading(false);
          return;
        }

        const data = await response.json();
        setLog(data.log);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLog();
  }, [logId]);

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Log Entry</h1>
          <Button variant="outline" asChild>
            <Link href="/logs">Back to Logs</Link>
          </Button>
        </div>
        <div className="text-muted-foreground text-center">Loading log entry...</div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Log Entry</h1>
          <Button variant="outline" asChild>
            <Link href="/logs">Back to Logs</Link>
          </Button>
        </div>
        <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-4 text-sm">
          <strong>Error:</strong> {error ?? 'Log entry not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Entry</h1>
          <p className="text-muted-foreground mt-2">Detailed view of a single log entry</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/logs">Back to Logs</Link>
        </Button>
      </div>

      <LogDetail log={log} />
    </div>
  );
}

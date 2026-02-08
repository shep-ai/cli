'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { LogStream } from '@/components/logs/log-stream';
import { useLogStream } from '@/hooks/use-log-stream';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function getConnectionStatusBadge(
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
): React.ReactElement {
  switch (status) {
    case 'connected':
      return <Badge variant="secondary">Connected</Badge>;
    case 'connecting':
      return <Badge variant="outline">Connecting...</Badge>;
    case 'disconnected':
      return <Badge variant="outline">Disconnected</Badge>;
    case 'error':
      return <Badge variant="destructive">Connection Error</Badge>;
  }
}

export default function LogStreamPage() {
  const { logs, connectionStatus, isPaused, pause, resume, clear } = useLogStream();
  const [autoScroll, setAutoScroll] = useState(true);

  const handlePauseToggle = () => {
    if (isPaused) {
      resume();
    } else {
      pause();
    }
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Logs</h1>
          <p className="text-muted-foreground mt-2">Real-time log streaming</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/logs">Back to Logs</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Log Stream</CardTitle>
              <CardDescription>
                {logs.length} logs | {getConnectionStatusBadge(connectionStatus)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="border-input h-4 w-4 rounded"
                />
                Auto-scroll
              </label>
              <Button variant="outline" size="sm" onClick={handlePauseToggle}>
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="outline" size="sm" onClick={clear}>
                Clear
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <LogStream logs={logs} autoScroll={autoScroll} />
        </CardContent>
      </Card>

      {connectionStatus === 'error' && (
        <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-4 text-sm">
          <strong>Connection Error:</strong> Unable to establish connection to log stream.
          Retrying...
        </div>
      )}
    </div>
  );
}

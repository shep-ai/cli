'use client';

import * as React from 'react';
import { LogsFilters } from '@/components/logs/logs-filters';
import { LogsTable } from '@/components/logs/logs-table';
import { useLogs, useLogsFilters } from '@/hooks/use-logs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LogsPage() {
  const [filters, updateFilters] = useLogsFilters();
  const { logs, total, limit, offset, isLoading, error } = useLogs(filters);

  const handleFilterChange = (newFilters: {
    level?: string;
    source?: string;
    startTime?: number;
    endTime?: number;
  }) => {
    updateFilters(newFilters);
  };

  const handlePageChange = (newOffset: number) => {
    updateFilters({ offset: newOffset });
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs</h1>
        <p className="text-muted-foreground mt-2">View and filter application logs</p>
      </div>

      <LogsFilters
        level={filters.level}
        source={filters.source}
        startTime={filters.startTime}
        endTime={filters.endTime}
        onFilterChange={handleFilterChange}
      />

      <Card>
        <CardHeader>
          <CardTitle>Log Entries</CardTitle>
          <CardDescription>
            {isLoading ? 'Loading logs...' : `${total} total log entries`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-destructive border-destructive/50 bg-destructive/10 rounded-md border p-4 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!error && (
            <LogsTable
              logs={logs}
              total={total}
              limit={limit}
              offset={offset}
              onPageChange={handlePageChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LogEntry } from '@/domain/generated/output';

export interface UseLogsFilters {
  level?: string;
  source?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export interface UseLogsResult {
  logs: LogEntry[];
  total: number;
  limit: number;
  offset: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLogs(initialFilters: UseLogsFilters = {}): UseLogsResult {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(initialFilters.limit ?? 50);
  const [offset, setOffset] = useState(initialFilters.offset ?? 0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<UseLogsFilters>(initialFilters);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Build query string from filters
      const params = new URLSearchParams();
      if (filters.level) params.append('level', filters.level);
      if (filters.source) params.append('source', filters.source);
      if (filters.startTime) params.append('startTime', filters.startTime.toString());
      if (filters.endTime) params.append('endTime', filters.endTime.toString());
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/logs?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }

      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setLimit(data.limit);
      setOffset(data.offset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setLogs([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, limit, offset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return {
    logs,
    total,
    limit,
    offset,
    isLoading,
    error,
    refetch: fetchLogs,
  };
}

// Hook to update filters (for use with LogsFilters component)
export function useLogsFilters(
  initialFilters: UseLogsFilters = {}
): [
  UseLogsFilters & { limit: number; offset: number },
  (newFilters: Partial<UseLogsFilters>) => void,
] {
  const [filters, setFilters] = useState<UseLogsFilters & { limit: number; offset: number }>({
    limit: 50,
    offset: 0,
    ...initialFilters,
  });

  const updateFilters = useCallback((newFilters: Partial<UseLogsFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      // Reset offset when filters change (unless explicitly provided)
      offset: 'offset' in newFilters ? newFilters.offset! : 0,
    }));
  }, []);

  return [filters, updateFilters];
}

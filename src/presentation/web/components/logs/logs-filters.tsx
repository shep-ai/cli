'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export interface LogsFiltersProps {
  level?: string;
  source?: string;
  startTime?: number;
  endTime?: number;
  onFilterChange: (filters: {
    level?: string;
    source?: string;
    startTime?: number;
    endTime?: number;
  }) => void;
}

export function LogsFilters({
  level,
  source,
  startTime,
  endTime,
  onFilterChange,
}: LogsFiltersProps) {
  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onFilterChange({
      level: value === 'all' ? undefined : value,
      source,
      startTime,
      endTime,
    });
  };

  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange({
      level,
      source: value || undefined,
      startTime,
      endTime,
    });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange({
      level,
      source,
      startTime: value ? new Date(value).getTime() : undefined,
      endTime,
    });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onFilterChange({
      level,
      source,
      startTime,
      endTime: value ? new Date(value).getTime() : undefined,
    });
  };

  const formatDateTimeLocal = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="level">Level</Label>
            <select
              id="level"
              name="level"
              value={level ?? 'all'}
              onChange={handleLevelChange}
              className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warn</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              name="source"
              placeholder="Filter by source"
              value={source ?? ''}
              onChange={handleSourceChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startTime">Start Time</Label>
            <input
              id="startTime"
              name="startTime"
              type="datetime-local"
              value={formatDateTimeLocal(startTime)}
              onChange={handleStartTimeChange}
              className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End Time</Label>
            <input
              id="endTime"
              name="endTime"
              type="datetime-local"
              value={formatDateTimeLocal(endTime)}
              onChange={handleEndTimeChange}
              className="border-input focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

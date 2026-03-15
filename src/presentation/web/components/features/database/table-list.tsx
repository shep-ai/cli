'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { TableInfo } from '@/app/actions/list-tables';

const SEARCH_THRESHOLD = 10;

export interface TableListProps {
  tables: TableInfo[];
  selectedTable: string | null;
  onSelectTable: (tableName: string) => void;
}

export function TableList({ tables, selectedTable, onSelectTable }: TableListProps) {
  const [search, setSearch] = useState('');

  const filteredTables =
    search.length > 0
      ? tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()))
      : tables;

  if (tables.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm" data-testid="table-list-empty">
        No tables found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" data-testid="table-list">
      {tables.length > SEARCH_THRESHOLD && (
        <div className="px-2 pt-2">
          <Input
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="table-list-search"
          />
        </div>
      )}
      <ScrollArea className="h-[calc(100vh-12rem)]">
        <div className="flex flex-col gap-0.5 p-2">
          {filteredTables.map((table) => (
            <button
              key={table.name}
              onClick={() => onSelectTable(table.name)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
                selectedTable === table.name ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
              }`}
              data-testid={`table-item-${table.name}`}
            >
              <span className="truncate font-mono text-xs">{table.name}</span>
              <Badge variant="secondary" className="ml-2 shrink-0">
                {table.rowCount.toLocaleString()}
              </Badge>
            </button>
          ))}
          {filteredTables.length === 0 && search.length > 0 && (
            <div className="text-muted-foreground p-4 text-center text-sm">
              No tables matching &quot;{search}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

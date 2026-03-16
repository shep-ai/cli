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
    <div className="flex h-full flex-col" data-testid="table-list">
      {tables.length > SEARCH_THRESHOLD && (
        <div className="border-border border-b px-2 py-2">
          <Input
            placeholder="Filter tables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 text-xs"
            data-testid="table-list-search"
          />
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 p-1.5">
          {filteredTables.map((table) => (
            <button
              key={table.name}
              onClick={() => onSelectTable(table.name)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors ${
                selectedTable === table.name
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-foreground hover:bg-muted/50'
              }`}
              data-testid={`table-item-${table.name}`}
            >
              <span className="truncate font-mono text-xs">{table.name}</span>
              <Badge
                variant={selectedTable === table.name ? 'default' : 'secondary'}
                className="ml-2 h-5 shrink-0 px-1.5 text-[10px]"
              >
                {table.rowCount.toLocaleString()}
              </Badge>
            </button>
          ))}
          {filteredTables.length === 0 && search.length > 0 && (
            <div className="text-muted-foreground p-4 text-center text-xs">
              No tables matching &quot;{search}&quot;
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

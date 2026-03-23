'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { ColumnInfo } from '@/app/actions/get-table-schema';

export interface SchemaViewerProps {
  columns: ColumnInfo[];
  loading?: boolean;
}

export function SchemaViewer({ columns, loading }: SchemaViewerProps) {
  if (loading) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center gap-2 p-12 text-sm"
        data-testid="schema-viewer-loading"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading schema...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center p-12 text-sm"
        data-testid="schema-viewer-empty"
      >
        No column information available
      </div>
    );
  }

  return (
    <div data-testid="schema-viewer">
      <div className="border-border overflow-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="font-mono text-xs font-medium">Name</TableHead>
              <TableHead className="font-mono text-xs font-medium">Type</TableHead>
              <TableHead className="font-mono text-xs font-medium">Nullable</TableHead>
              <TableHead className="font-mono text-xs font-medium">Default</TableHead>
              <TableHead className="font-mono text-xs font-medium">Primary Key</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((col) => (
              <TableRow key={col.name}>
                <TableCell className="font-mono text-xs font-medium">{col.name}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {col.type || 'any'}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  {col.notnull ? (
                    <span className="text-muted-foreground">No</span>
                  ) : (
                    <span>Yes</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground font-mono text-xs">
                  {col.defaultValue ?? <span className="italic">None</span>}
                </TableCell>
                <TableCell>
                  {col.primaryKey ? (
                    <Badge
                      variant="default"
                      className="text-[10px]"
                      data-testid={`pk-badge-${col.name}`}
                    >
                      PK
                    </Badge>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

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
import type { ColumnInfo } from '@/app/actions/get-table-schema';

export interface SchemaViewerProps {
  columns: ColumnInfo[];
  loading?: boolean;
}

export function SchemaViewer({ columns, loading }: SchemaViewerProps) {
  if (loading) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center p-8 text-sm"
        data-testid="schema-viewer-loading"
      >
        Loading schema...
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <div
        className="text-muted-foreground flex items-center justify-center p-8 text-sm"
        data-testid="schema-viewer-empty"
      >
        No column information available
      </div>
    );
  }

  return (
    <div data-testid="schema-viewer">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Nullable</TableHead>
            <TableHead>Default</TableHead>
            <TableHead>Primary Key</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((col) => (
            <TableRow key={col.name}>
              <TableCell className="font-mono text-sm">{col.name}</TableCell>
              <TableCell className="font-mono text-sm">{col.type}</TableCell>
              <TableCell>{col.notnull ? 'No' : 'Yes'}</TableCell>
              <TableCell className="text-muted-foreground">{col.defaultValue ?? 'None'}</TableCell>
              <TableCell>
                {col.primaryKey ? (
                  <Badge variant="default" data-testid={`pk-badge-${col.name}`}>
                    PK
                  </Badge>
                ) : null}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Database } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TableList } from './table-list';
import { RowBrowser } from './row-browser';
import { SchemaViewer } from './schema-viewer';
import { QueryRunner } from './query-runner';
import type { TableInfo } from '@/app/actions/list-tables';
import type { ColumnInfo, GetTableSchemaResult } from '@/app/actions/get-table-schema';
import type { GetTableRowsResult } from '@/app/actions/get-table-rows';
import type { ExecuteQueryResult } from '@/app/actions/execute-query';

type TabValue = 'data' | 'schema' | 'query';

export interface DatabasePageClientProps {
  initialTables: TableInfo[];
  fetchRows: (tableName: string, page: number) => Promise<GetTableRowsResult>;
  fetchSchema: (tableName: string) => Promise<GetTableSchemaResult>;
  runQuery: (sql: string) => Promise<ExecuteQueryResult>;
  className?: string;
}

export function DatabasePageClient({
  initialTables,
  fetchRows: fetchRowsAction,
  fetchSchema: fetchSchemaAction,
  runQuery,
  className,
}: DatabasePageClientProps) {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('data');

  // Row browser state
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [rowsLoading, setRowsLoading] = useState(false);

  // Schema state
  const [schemaColumns, setSchemaColumns] = useState<ColumnInfo[]>([]);
  const [schemaLoading, setSchemaLoading] = useState(false);

  const fetchRows = useCallback(
    async (tableName: string, pageNum: number) => {
      setRowsLoading(true);
      try {
        const result = await fetchRowsAction(tableName, pageNum);
        if (result.error) {
          setColumns([]);
          setRows([]);
          setTotalRows(0);
          return;
        }
        setColumns(result.columns ?? []);
        setRows(result.rows ?? []);
        setTotalRows(result.totalRows ?? 0);
        setPage(result.page ?? 0);
        setPageSize(result.pageSize ?? 50);
      } finally {
        setRowsLoading(false);
      }
    },
    [fetchRowsAction]
  );

  const fetchSchema = useCallback(
    async (tableName: string) => {
      setSchemaLoading(true);
      try {
        const result = await fetchSchemaAction(tableName);
        if (result.error) {
          setSchemaColumns([]);
          return;
        }
        setSchemaColumns(result.columns ?? []);
      } finally {
        setSchemaLoading(false);
      }
    },
    [fetchSchemaAction]
  );

  const handleSelectTable = useCallback(
    (tableName: string) => {
      setSelectedTable(tableName);
      setPage(0);
      setActiveTab('data');
      fetchRows(tableName, 0);
      fetchSchema(tableName);
    },
    [fetchRows, fetchSchema]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (selectedTable) {
        setPage(newPage);
        fetchRows(selectedTable, newPage);
      }
    },
    [selectedTable, fetchRows]
  );

  const handleExecuteQuery = useCallback(
    async (sql: string) => {
      return runQuery(sql);
    },
    [runQuery]
  );

  return (
    <div data-testid="database-page-client" className={className}>
      <div className="mb-4 flex items-center gap-2">
        <Database className="text-muted-foreground h-4 w-4" />
        <h1 className="text-sm font-bold tracking-tight">Database</h1>
      </div>

      <div className="flex gap-4">
        {/* Sidebar: Table list */}
        <Card className="w-64 shrink-0">
          <CardContent className="p-0">
            <TableList
              tables={initialTables}
              selectedTable={selectedTable}
              onSelectTable={handleSelectTable}
            />
          </CardContent>
        </Card>

        {/* Main content area */}
        <div className="min-w-0 flex-1">
          {selectedTable ? (
            <Card>
              <CardContent className="p-4">
                <div className="mb-3 font-mono text-sm font-medium">{selectedTable}</div>
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as TabValue)}
                  data-testid="database-tabs"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="data" className="text-xs" data-testid="tab-data">
                      Data
                    </TabsTrigger>
                    <TabsTrigger value="schema" className="text-xs" data-testid="tab-schema">
                      Schema
                    </TabsTrigger>
                    <TabsTrigger value="query" className="text-xs" data-testid="tab-query">
                      Query
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="data">
                    <RowBrowser
                      columns={columns}
                      rows={rows}
                      totalRows={totalRows}
                      page={page}
                      pageSize={pageSize}
                      onPageChange={handlePageChange}
                      loading={rowsLoading}
                    />
                  </TabsContent>

                  <TabsContent value="schema">
                    <SchemaViewer columns={schemaColumns} loading={schemaLoading} />
                  </TabsContent>

                  <TabsContent value="query">
                    <QueryRunner onExecute={handleExecuteQuery} />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center p-12">
                <p className="text-muted-foreground text-sm">
                  Select a table from the list to browse its data
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

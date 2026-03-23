'use client';

import { useState, useCallback } from 'react';
import { Database, Table2, Code2, Columns3 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div data-testid="database-page-client" className={`flex flex-col ${className ?? ''}`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5 pt-1">
        <div className="bg-primary/10 flex h-7 w-7 items-center justify-center rounded-md">
          <Database className="text-primary h-4 w-4" />
        </div>
        <div>
          <h1 className="text-sm font-semibold tracking-tight">Database Browser</h1>
          <p className="text-muted-foreground text-xs">
            {initialTables.length} table{initialTables.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Main layout: sidebar + content */}
      <div className="flex min-h-0 flex-1 gap-3">
        {/* Sidebar: Table list */}
        <div className="border-border bg-card flex w-56 flex-col rounded-lg border">
          <div className="border-border border-b px-3 py-2">
            <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
              Tables
            </span>
          </div>
          <div className="min-h-0 flex-1">
            <TableList
              tables={initialTables}
              selectedTable={selectedTable}
              onSelectTable={handleSelectTable}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selectedTable ? (
            <div className="border-border bg-card flex min-h-0 flex-1 flex-col rounded-lg border">
              {/* Table name header + tabs */}
              <div className="border-border flex items-center justify-between border-b px-4 py-2">
                <span className="font-mono text-sm font-medium">{selectedTable}</span>
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as TabValue)}
                  data-testid="database-tabs"
                >
                  <TabsList className="h-7">
                    <TabsTrigger
                      value="data"
                      className="gap-1.5 px-2.5 text-xs"
                      data-testid="tab-data"
                    >
                      <Table2 className="h-3 w-3" />
                      Data
                    </TabsTrigger>
                    <TabsTrigger
                      value="schema"
                      className="gap-1.5 px-2.5 text-xs"
                      data-testid="tab-schema"
                    >
                      <Columns3 className="h-3 w-3" />
                      Schema
                    </TabsTrigger>
                    <TabsTrigger
                      value="query"
                      className="gap-1.5 px-2.5 text-xs"
                      data-testid="tab-query"
                    >
                      <Code2 className="h-3 w-3" />
                      Query
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Tab content */}
              <div className="min-h-0 flex-1 overflow-auto p-4">
                {activeTab === 'data' && (
                  <RowBrowser
                    columns={columns}
                    rows={rows}
                    totalRows={totalRows}
                    page={page}
                    pageSize={pageSize}
                    onPageChange={handlePageChange}
                    loading={rowsLoading}
                  />
                )}
                {activeTab === 'schema' && (
                  <SchemaViewer columns={schemaColumns} loading={schemaLoading} />
                )}
                {activeTab === 'query' && <QueryRunner onExecute={handleExecuteQuery} />}
              </div>
            </div>
          ) : (
            <div className="border-border bg-card flex flex-1 flex-col items-center justify-center rounded-lg border">
              <div className="bg-muted/50 mb-3 flex h-12 w-12 items-center justify-center rounded-full">
                <Database className="text-muted-foreground h-6 w-6" />
              </div>
              <p className="text-muted-foreground text-sm">Select a table to browse its data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

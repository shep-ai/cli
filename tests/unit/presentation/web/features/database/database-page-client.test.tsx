import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DatabasePageClient,
  type DatabasePageClientProps,
} from '@/components/features/database/database-page-client';
import type { TableInfo } from '@/app/actions/list-tables';
import type { GetTableRowsResult } from '@/app/actions/get-table-rows';
import type { GetTableSchemaResult } from '@/app/actions/get-table-schema';
import type { ExecuteQueryResult } from '@/app/actions/execute-query';

const sampleTables: TableInfo[] = [
  { name: 'features', rowCount: 120 },
  { name: 'repositories', rowCount: 5 },
  { name: 'settings', rowCount: 10 },
];

function makeRowsResult(overrides: Partial<GetTableRowsResult> = {}): GetTableRowsResult {
  return {
    columns: ['id', 'name', 'status'],
    rows: [
      { id: 1, name: 'feat-1', status: 'active' },
      { id: 2, name: 'feat-2', status: 'done' },
    ],
    totalRows: 120,
    page: 0,
    pageSize: 50,
    ...overrides,
  };
}

function makeSchemaResult(overrides: Partial<GetTableSchemaResult> = {}): GetTableSchemaResult {
  return {
    columns: [
      { name: 'id', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: true },
      { name: 'name', type: 'TEXT', notnull: true, defaultValue: null, primaryKey: false },
      { name: 'status', type: 'TEXT', notnull: false, defaultValue: "'active'", primaryKey: false },
    ],
    ...overrides,
  };
}

function makeQueryResult(overrides: Partial<ExecuteQueryResult> = {}): ExecuteQueryResult {
  return {
    columns: ['count'],
    rows: [{ count: 120 }],
    ...overrides,
  };
}

describe('DatabasePageClient integration', () => {
  let mockFetchRows: ReturnType<typeof vi.fn>;
  let mockFetchSchema: ReturnType<typeof vi.fn>;
  let mockRunQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetchRows = vi.fn().mockResolvedValue(makeRowsResult());
    mockFetchSchema = vi.fn().mockResolvedValue(makeSchemaResult());
    mockRunQuery = vi.fn().mockResolvedValue(makeQueryResult());
  });

  function renderPage(tables = sampleTables) {
    return render(
      <DatabasePageClient
        initialTables={tables}
        fetchRows={mockFetchRows as unknown as DatabasePageClientProps['fetchRows']}
        fetchSchema={mockFetchSchema as unknown as DatabasePageClientProps['fetchSchema']}
        runQuery={mockRunQuery as unknown as DatabasePageClientProps['runQuery']}
      />
    );
  }

  it('renders table list and placeholder when no table is selected', () => {
    renderPage();

    expect(screen.getByTestId('table-list')).toBeInTheDocument();
    expect(screen.getByText('features')).toBeInTheDocument();
    expect(screen.getByText('repositories')).toBeInTheDocument();
    expect(screen.getByText('settings')).toBeInTheDocument();
    expect(screen.getByText('Select a table from the list to browse its data')).toBeInTheDocument();
  });

  it('fetches rows and schema when a table is selected', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('table-item-features'));

    await waitFor(() => {
      expect(mockFetchRows).toHaveBeenCalledWith('features', 0);
      expect(mockFetchSchema).toHaveBeenCalledWith('features');
    });

    await waitFor(() => {
      expect(screen.getByTestId('row-browser')).toBeInTheDocument();
    });
  });

  it('shows rows in the data tab after selecting a table', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('table-item-features'));

    await waitFor(() => {
      expect(screen.getByText('feat-1')).toBeInTheDocument();
      expect(screen.getByText('feat-2')).toBeInTheDocument();
    });

    // Column headers present
    expect(screen.getByText('id')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
  });

  it('switches to schema tab and shows column metadata', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('table-item-features'));
    await waitFor(() => {
      expect(screen.getByTestId('row-browser')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-schema'));

    await waitFor(() => {
      expect(screen.getByTestId('schema-viewer')).toBeInTheDocument();
    });

    // Column metadata rendered
    expect(screen.getByTestId('pk-badge-id')).toBeInTheDocument();
  });

  it('switches to query tab and executes a SELECT query', async () => {
    const user = userEvent.setup();
    renderPage();

    // Select a table first to show tabs
    await user.click(screen.getByTestId('table-item-features'));
    await waitFor(() => {
      expect(screen.getByTestId('tab-query')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-query'));
    await waitFor(() => {
      expect(screen.getByTestId('query-runner')).toBeInTheDocument();
    });

    // Type and execute a query
    const textarea = screen.getByTestId('query-runner-input');
    await user.type(textarea, 'SELECT COUNT(*) as count FROM features');

    await user.click(screen.getByTestId('query-runner-execute'));

    await waitFor(() => {
      expect(mockRunQuery).toHaveBeenCalledWith('SELECT COUNT(*) as count FROM features');
    });

    await waitFor(() => {
      expect(screen.getByTestId('query-runner-results')).toBeInTheDocument();
    });
  });

  it('rejects write operations in query runner with client-side error', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByTestId('table-item-features'));
    await waitFor(() => {
      expect(screen.getByTestId('tab-query')).toBeInTheDocument();
    });

    await user.click(screen.getByTestId('tab-query'));
    await waitFor(() => {
      expect(screen.getByTestId('query-runner')).toBeInTheDocument();
    });

    const textarea = screen.getByTestId('query-runner-input');
    await user.type(textarea, 'DELETE FROM features WHERE id = 1');

    await user.click(screen.getByTestId('query-runner-execute'));

    await waitFor(() => {
      expect(screen.getByTestId('query-runner-error')).toBeInTheDocument();
    });

    // Server action should NOT have been called
    expect(mockRunQuery).not.toHaveBeenCalled();
  });

  it('resets pagination when switching tables', async () => {
    const user = userEvent.setup();

    // First table returns page 0
    mockFetchRows
      .mockResolvedValueOnce(makeRowsResult({ page: 0 }))
      .mockResolvedValueOnce(
        makeRowsResult({ page: 1, rows: [{ id: 51, name: 'feat-51', status: 'active' }] })
      )
      // After switching to repositories, page resets to 0
      .mockResolvedValueOnce(
        makeRowsResult({
          columns: ['id', 'path'],
          rows: [{ id: 1, path: '/repo' }],
          totalRows: 5,
          page: 0,
        })
      );

    renderPage();

    // Select features
    await user.click(screen.getByTestId('table-item-features'));
    await waitFor(() => {
      expect(mockFetchRows).toHaveBeenCalledWith('features', 0);
    });

    // Navigate to page 1
    await waitFor(() => {
      expect(screen.getByTestId('row-browser-next')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('row-browser-next'));
    await waitFor(() => {
      expect(mockFetchRows).toHaveBeenCalledWith('features', 1);
    });

    // Switch to repositories — should reset to page 0
    await user.click(screen.getByTestId('table-item-repositories'));
    await waitFor(() => {
      expect(mockFetchRows).toHaveBeenCalledWith('repositories', 0);
    });
  });

  it('shows empty state for database with no tables', () => {
    renderPage([]);

    expect(screen.getByTestId('table-list-empty')).toBeInTheDocument();
    expect(screen.getByText('No tables found')).toBeInTheDocument();
  });

  it('shows error in data tab when fetchRows returns an error', async () => {
    const user = userEvent.setup();
    mockFetchRows.mockResolvedValue({ error: 'Connection failed' });

    renderPage();
    await user.click(screen.getByTestId('table-item-features'));

    // Should not crash — row browser shows empty state
    await waitFor(() => {
      expect(screen.getByTestId('row-browser-empty')).toBeInTheDocument();
    });
  });
});

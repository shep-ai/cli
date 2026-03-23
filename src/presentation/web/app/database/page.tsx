import { redirect } from 'next/navigation';
import { listTables } from '@/app/actions/list-tables';
import { getTableRows } from '@/app/actions/get-table-rows';
import { getTableSchema } from '@/app/actions/get-table-schema';
import { executeQuery } from '@/app/actions/execute-query';
import { DatabasePageClient } from '@/components/features/database/database-page-client';
import { getFeatureFlags } from '@/lib/feature-flags';

/** Skip static pre-rendering since we need runtime database connection. */
export const dynamic = 'force-dynamic';

export default async function DatabasePage() {
  const flags = getFeatureFlags();
  if (!flags.databaseBrowser) {
    redirect('/settings#feature-flags');
  }

  const { tables, error } = await listTables();

  if (error || !tables) {
    return (
      <div className="flex h-full flex-col p-6">
        <p className="text-destructive text-sm">Failed to load database: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden px-6 pb-6">
      <DatabasePageClient
        initialTables={tables}
        fetchRows={getTableRows}
        fetchSchema={getTableSchema}
        runQuery={executeQuery}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

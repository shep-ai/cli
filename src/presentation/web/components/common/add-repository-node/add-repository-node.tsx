'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import type { AddRepositoryNodeData } from './add-repository-node-config';
import { pickFolder } from './pick-folder';

export function AddRepositoryNode({
  data,
}: {
  data: AddRepositoryNodeData;
  [key: string]: unknown;
}) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const path = await pickFolder();
      if (path) {
        data.onSelect?.(path);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="group">
      <button
        type="button"
        data-testid="add-repository-node-card"
        onClick={handleClick}
        disabled={loading}
        className="nodrag border-muted-foreground/30 flex w-56 cursor-pointer items-center gap-3 rounded-full border-2 border-dashed px-4 py-3 transition-colors hover:border-blue-500 hover:text-blue-500 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <Plus className="h-5 w-5 shrink-0" />
        )}
        <span data-testid="add-repository-node-label" className="text-sm font-medium">
          {loading ? 'Opening...' : 'Add Repository'}
        </span>
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { pickFolder } from './pick-folder';

interface AddRepositoryButtonProps {
  onSelect?: (path: string) => void;
}

export function AddRepositoryButton({ onSelect }: AddRepositoryButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (loading) return;
    setLoading(true);
    try {
      const path = await pickFolder();
      if (path) {
        onSelect?.(path);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      data-testid="add-repository-button"
      onClick={handleClick}
      disabled={loading}
      className="border-muted-foreground/30 flex cursor-pointer items-center gap-2 rounded-full border-2 border-dashed px-3 py-1.5 text-xs transition-colors hover:border-blue-500 hover:text-blue-500 disabled:cursor-wait disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <Plus className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="font-medium">{loading ? 'Opening...' : 'Add Repository'}</span>
    </button>
  );
}

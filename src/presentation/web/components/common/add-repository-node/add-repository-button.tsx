'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label="Add Repository"
            data-testid="add-repository-button"
            onClick={handleClick}
            disabled={loading}
            className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Plus className="h-6 w-6" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>Add Repository</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

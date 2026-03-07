'use client';

import { useState } from 'react';
import { FolderPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add Repository"
            data-testid="add-repository-button"
            onClick={handleClick}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <FolderPlus className="h-5 w-5" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Add Repository</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

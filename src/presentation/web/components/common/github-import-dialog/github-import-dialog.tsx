'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GitHubUrlInput } from './github-url-input';
import { GitHubRepoBrowser } from './github-repo-browser';
import { importGitHubRepository } from '@/app/actions/import-github-repository';
import type { Repository } from '@shepai/core/domain/generated/output';

export interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: (repository: Repository) => void;
}

export function GitHubImportDialog({
  open,
  onOpenChange,
  onImportComplete,
}: GitHubImportDialogProps) {
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  async function handleImport(url: string) {
    setImporting(true);
    setError('');
    try {
      const result = await importGitHubRepository({ url });
      if (result.error) {
        setError(result.error);
      } else if (result.repository) {
        onImportComplete(result.repository);
        onOpenChange(false);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setImporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import from GitHub</DialogTitle>
          <DialogDescription>Clone a GitHub repository and add it to Shep.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="url">
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">
              URL
            </TabsTrigger>
            <TabsTrigger value="browse" className="flex-1">
              Browse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <GitHubUrlInput onSubmit={handleImport} loading={importing} />
          </TabsContent>

          <TabsContent value="browse">
            <GitHubRepoBrowser onSelect={handleImport} loading={importing} />
          </TabsContent>
        </Tabs>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Globe, Loader2, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { listGitHubRepositories } from '@/app/actions/list-github-repositories';
import type { GitHubRepo } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

export interface GitHubRepoBrowserProps {
  onSelect: (nameWithOwner: string) => void;
  loading?: boolean;
  /** Override the fetch function for testing/stories */
  fetchRepos?: (input?: {
    search?: string;
    limit?: number;
  }) => Promise<{ repos?: GitHubRepo[]; error?: string }>;
}

export function GitHubRepoBrowser({
  onSelect,
  loading: externalLoading = false,
  fetchRepos = listGitHubRepositories,
}: GitHubRepoBrowserProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (searchTerm?: string) => {
      setFetching(true);
      setError('');
      try {
        const result = await fetchRepos(searchTerm ? { search: searchTerm } : undefined);
        if (result.error) {
          setError(result.error);
          setRepos([]);
        } else {
          setRepos(result.repos ?? []);
        }
      } catch {
        setError('Failed to fetch repositories');
        setRepos([]);
      } finally {
        setFetching(false);
      }
    },
    [fetchRepos]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(value || undefined);
    }, 300);
  }

  const disabled = externalLoading;

  if (error && !fetching) {
    return (
      <div
        className="flex flex-col items-center gap-2 py-8 text-center"
        data-testid="repo-browser-error"
      >
        <AlertCircle className="text-destructive h-8 w-8" />
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
          disabled={disabled}
          aria-label="Search repositories"
        />
      </div>

      <div
        className="max-h-64 overflow-y-auto rounded-md border"
        role="listbox"
        aria-label="GitHub repositories"
      >
        {fetching ? (
          <div className="flex flex-col gap-2 p-3" data-testid="repo-browser-loading">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-${String(i)}`} className="flex flex-col gap-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-72" />
              </div>
            ))}
          </div>
        ) : repos.length === 0 ? (
          <div
            className="text-muted-foreground py-8 text-center text-sm"
            data-testid="repo-browser-empty"
          >
            No repositories found
          </div>
        ) : (
          repos.map((repo) => (
            <button
              key={repo.nameWithOwner}
              type="button"
              role="option"
              aria-selected={false}
              className="hover:bg-accent flex w-full items-start gap-2 border-b px-3 py-2 text-left last:border-b-0 disabled:opacity-50"
              onClick={() => onSelect(repo.nameWithOwner)}
              disabled={disabled}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">{repo.nameWithOwner}</span>
                  <Badge
                    variant={repo.isPrivate ? 'secondary' : 'outline'}
                    className="shrink-0 text-xs"
                  >
                    {repo.isPrivate ? (
                      <>
                        <Lock className="mr-1 h-3 w-3" />
                        Private
                      </>
                    ) : (
                      <>
                        <Globe className="mr-1 h-3 w-3" />
                        Public
                      </>
                    )}
                  </Badge>
                </div>
                {repo.description ? (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {repo.description}
                  </p>
                ) : null}
              </div>
              {disabled ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" /> : null}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

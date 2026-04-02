'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Globe, Loader2, Search, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { listGitHubRepositories } from '@/app/actions/list-github-repositories';
import { listGitHubOrganizations } from '@/app/actions/list-github-organizations';
import type { GitHubRepo } from '@shepai/core/application/ports/output/services/github-repository-service.interface';
import type { GitHubOrganization } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

/** Sentinel value representing the authenticated user's personal account */
const PERSONAL_OWNER = '__personal__';

export interface GitHubRepoBrowserProps {
  onSelect: (nameWithOwner: string) => void;
  loading?: boolean;
  /** Override the fetch function for testing/stories */
  fetchRepos?: (input?: {
    search?: string;
    limit?: number;
    owner?: string;
  }) => Promise<{ repos?: GitHubRepo[]; error?: string }>;
  /** Override the fetch function for testing/stories */
  fetchOrgs?: () => Promise<{ orgs?: GitHubOrganization[]; error?: string }>;
}

export function GitHubRepoBrowser({
  onSelect,
  loading: externalLoading = false,
  fetchRepos = listGitHubRepositories,
  fetchOrgs = listGitHubOrganizations,
}: GitHubRepoBrowserProps) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [orgs, setOrgs] = useState<GitHubOrganization[]>([]);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(PERSONAL_OWNER);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch organizations on mount
  useEffect(() => {
    async function loadOrgs() {
      try {
        const result = await fetchOrgs();
        if (result.orgs) {
          setOrgs(result.orgs);
        }
      } catch {
        // Org listing failure is non-critical — user can still browse personal repos
      }
    }
    loadOrgs();
  }, [fetchOrgs]);

  const fetchData = useCallback(
    async (searchTerm?: string, owner?: string) => {
      setFetching(true);
      setError('');
      try {
        const input: { search?: string; owner?: string } = {};
        if (searchTerm) input.search = searchTerm;
        if (owner && owner !== PERSONAL_OWNER) input.owner = owner;
        const result = await fetchRepos(Object.keys(input).length > 0 ? input : undefined);
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
    fetchData(search || undefined, selectedOwner);
  }, [fetchData, selectedOwner]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(value || undefined, selectedOwner);
    }, 300);
  }

  function handleOwnerChange(value: string) {
    setSelectedOwner(value);
    setSearch('');
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
      {orgs.length > 0 ? (
        <Select value={selectedOwner} onValueChange={handleOwnerChange} disabled={disabled}>
          <SelectTrigger aria-label="Select owner">
            <SelectValue placeholder="Select owner" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PERSONAL_OWNER}>My repositories</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.login} value={org.login}>
                {org.login}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search repositories..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="ps-9"
          disabled={disabled}
          aria-label="Search repositories"
        />
      </div>

      <div
        className="max-h-64 overflow-x-hidden overflow-y-auto rounded-md border"
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
              className="hover:bg-accent flex w-full items-start gap-2 border-b px-3 py-2.5 text-start last:border-b-0 disabled:opacity-50"
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
                        <Lock className="me-1 h-3 w-3" />
                        Private
                      </>
                    ) : (
                      <>
                        <Globe className="me-1 h-3 w-3" />
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

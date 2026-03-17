'use client';

import { useState, type KeyboardEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Matches supported GitHub URL formats:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 * - owner/repo (shorthand)
 */
const GITHUB_URL_PATTERN =
  /^(?:https:\/\/github\.com\/([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?|git@github\.com:([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+?)(?:\.git)?|([a-zA-Z0-9._-]+)\/([a-zA-Z0-9._-]+))$/;

export function isValidGitHubUrl(url: string): boolean {
  return GITHUB_URL_PATTERN.test(url.trim());
}

export interface GitHubUrlInputProps {
  onSubmit: (url: string) => void;
  loading?: boolean;
}

export function GitHubUrlInput({ onSubmit, loading = false }: GitHubUrlInputProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function handleSubmit() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError('Please enter a GitHub URL');
      return;
    }
    if (!isValidGitHubUrl(trimmed)) {
      setError('Enter a valid GitHub URL (e.g. owner/repo or https://github.com/owner/repo)');
      return;
    }
    setError('');
    onSubmit(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="github-url-input">GitHub URL</Label>
      <div className="flex gap-2">
        <Input
          id="github-url-input"
          placeholder="owner/repo or https://github.com/owner/repo"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={handleKeyDown}
          disabled={loading}
          aria-invalid={!!error}
          aria-describedby={error ? 'github-url-error' : undefined}
        />
        <Button onClick={handleSubmit} disabled={loading || !url.trim()} size="sm">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import'}
        </Button>
      </div>
      {error ? (
        <p id="github-url-error" className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

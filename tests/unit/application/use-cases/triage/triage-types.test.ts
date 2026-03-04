/**
 * Triage Use Case Types — Type Contract Tests
 *
 * Validates that IssueCluster, TriageIssuesInput, and TriageIssuesResult
 * compile correctly and their type contracts are sound.
 */

import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import type {
  IssueCluster,
  TriageIssuesInput,
  TriageIssuesResult,
} from '@/application/use-cases/triage/types.js';
import type { ExternalIssue } from '@/application/ports/output/services/external-issue-fetcher.interface.js';

describe('Triage use case types', () => {
  it('should define IssueCluster with name, description, and issueNumbers', () => {
    const cluster: IssueCluster = {
      name: 'Authentication improvements',
      description: 'Issues related to login and auth flow',
      issueNumbers: [12, 15, 23],
    };
    expect(cluster.name).toBe('Authentication improvements');
    expect(cluster.description).toBe('Issues related to login and auth flow');
    expect(cluster.issueNumbers).toEqual([12, 15, 23]);
  });

  it('should define TriageIssuesInput with required and optional fields', () => {
    const minimalInput: TriageIssuesInput = {
      repositoryPath: '/path/to/repo',
    };
    const fullInput: TriageIssuesInput = {
      repositoryPath: '/path/to/repo',
      repo: 'owner/repo',
      labels: ['bug', 'enhancement'],
      limit: 50,
    };
    expect(minimalInput.repositoryPath).toBe('/path/to/repo');
    expect(minimalInput.repo).toBeUndefined();
    expect(fullInput.repo).toBe('owner/repo');
    expect(fullInput.labels).toEqual(['bug', 'enhancement']);
    expect(fullInput.limit).toBe(50);
  });

  it('should define TriageIssuesResult with issues and clusters', () => {
    const issue: ExternalIssue = {
      title: 'Fix login bug',
      description: 'Login fails',
      labels: ['bug'],
      url: 'https://github.com/org/repo/issues/12',
      source: 'github',
      number: 12,
    };
    const cluster: IssueCluster = {
      name: 'Auth fixes',
      description: 'Authentication-related issues',
      issueNumbers: [12],
    };
    const result: TriageIssuesResult = {
      issues: [issue],
      clusters: [cluster],
    };
    expect(result.issues).toHaveLength(1);
    expect(result.clusters).toHaveLength(1);
    expect(result.issues[0].title).toBe('Fix login bug');
    expect(result.clusters[0].name).toBe('Auth fixes');
  });
});

/**
 * JiraTicketFetcher Unit Tests
 *
 * Tests for fetching Jira tickets via REST API.
 *
 * TDD Phase: RED
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JiraTicketFetcher } from '@/infrastructure/services/external/jira-ticket.service.js';
import {
  IssueNotFoundError,
  IssueAuthenticationError,
  IssueServiceUnavailableError,
} from '@/application/ports/output/external-issue-fetcher.interface.js';

describe('JiraTicketFetcher', () => {
  let fetcher: JiraTicketFetcher;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    fetcher = new JiraTicketFetcher({
      baseUrl: 'https://jira.example.com',
      email: 'user@example.com',
      token: 'jira-api-token',
      fetchFn: mockFetch as any,
    });
  });

  describe('fetchJiraTicket()', () => {
    it('should fetch ticket by key', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          key: 'PROJ-123',
          fields: {
            summary: 'Implement user auth',
            description: 'Add OAuth 2.0 authentication to the API',
            labels: ['backend', 'security'],
          },
        }),
      });

      const issue = await fetcher.fetchJiraTicket('PROJ-123');

      expect(issue.title).toBe('Implement user auth');
      expect(issue.description).toBe('Add OAuth 2.0 authentication to the API');
      expect(issue.labels).toEqual(['backend', 'security']);
      expect(issue.url).toBe('https://jira.example.com/browse/PROJ-123');
      expect(issue.source).toBe('jira');
    });

    it('should throw IssueNotFoundError when ticket does not exist', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ errorMessages: ['Issue does not exist'] }),
      });

      await expect(fetcher.fetchJiraTicket('PROJ-999')).rejects.toThrow(IssueNotFoundError);
    });

    it('should throw IssueAuthenticationError on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ errorMessages: ['Unauthorized'] }),
      });

      await expect(fetcher.fetchJiraTicket('PROJ-1')).rejects.toThrow(IssueAuthenticationError);
    });

    it('should throw IssueAuthenticationError on 403', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ errorMessages: ['Forbidden'] }),
      });

      await expect(fetcher.fetchJiraTicket('PROJ-1')).rejects.toThrow(IssueAuthenticationError);
    });

    it('should throw IssueServiceUnavailableError on network error', async () => {
      mockFetch.mockRejectedValue(new Error('fetch failed'));

      await expect(fetcher.fetchJiraTicket('PROJ-1')).rejects.toThrow(IssueServiceUnavailableError);
    });

    it('should handle ticket with null description', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          key: 'PROJ-1',
          fields: {
            summary: 'Bare ticket',
            description: null,
            labels: [],
          },
        }),
      });

      const issue = await fetcher.fetchJiraTicket('PROJ-1');

      expect(issue.description).toBe('');
      expect(issue.labels).toEqual([]);
    });

    it('should throw IssueServiceUnavailableError when config is missing', () => {
      expect(
        () =>
          new JiraTicketFetcher({
            baseUrl: '',
            email: 'user@example.com',
            token: 'token',
          })
      ).toThrow(IssueServiceUnavailableError);
    });
  });
});

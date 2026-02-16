/**
 * Jira Ticket Fetcher Service
 *
 * Fetches Jira tickets using the Jira REST API v3 via fetch.
 * Requires baseUrl, email, and API token for authentication.
 */

import type {
  IExternalIssueFetcher,
  ExternalIssue,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';
import {
  IssueNotFoundError,
  IssueAuthenticationError,
  IssueServiceUnavailableError,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export interface JiraConfig {
  baseUrl: string;
  email: string;
  token: string;
  fetchFn?: FetchFn;
}

export class JiraTicketFetcher implements Pick<IExternalIssueFetcher, 'fetchJiraTicket'> {
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly fetchFn: FetchFn;

  constructor(config: JiraConfig) {
    if (!config.baseUrl) {
      throw new IssueServiceUnavailableError(
        'Jira configuration is incomplete: baseUrl is required'
      );
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.authHeader = `Basic ${Buffer.from(`${config.email}:${config.token}`).toString('base64')}`;
    this.fetchFn = config.fetchFn ?? globalThis.fetch;
  }

  async fetchJiraTicket(key: string): Promise<ExternalIssue> {
    const url = `${this.baseUrl}/rest/api/3/issue/${key}?fields=summary,description,labels`;

    try {
      const response = await this.fetchFn(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new IssueNotFoundError(`Jira ticket ${key} not found`);
        }
        if (response.status === 401 || response.status === 403) {
          throw new IssueAuthenticationError(
            `Jira authentication failed (${response.status}): check your email and API token`
          );
        }
        throw new IssueServiceUnavailableError(`Jira API returned ${response.status}`);
      }

      const data = (await response.json()) as {
        key: string;
        fields: {
          summary: string;
          description: string | null;
          labels: string[];
        };
      };

      return {
        title: data.fields.summary,
        description: data.fields.description ?? '',
        labels: data.fields.labels ?? [],
        url: `${this.baseUrl}/browse/${key}`,
        source: 'jira',
      };
    } catch (err: unknown) {
      // Re-throw our own errors
      if (
        err instanceof IssueNotFoundError ||
        err instanceof IssueAuthenticationError ||
        err instanceof IssueServiceUnavailableError
      ) {
        throw err;
      }
      throw new IssueServiceUnavailableError(
        `Failed to connect to Jira: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

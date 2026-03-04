/**
 * TriageIssuesUseCase
 *
 * Orchestrates the fetch → cluster pipeline for issue triage.
 * Fetches open issues via IExternalIssueFetcher, then clusters them
 * semantically via IStructuredAgentCaller. Returns the proposed clusters
 * to the presentation layer — interactive review is NOT handled here
 * (Clean Architecture: use case is I/O-agnostic).
 *
 * Errors from the fetcher or AI caller are propagated to the caller.
 */

import { injectable, inject } from 'tsyringe';
import type {
  IExternalIssueFetcher,
  ExternalIssue,
} from '../../ports/output/services/external-issue-fetcher.interface.js';
import type { IStructuredAgentCaller } from '../../ports/output/agents/structured-agent-caller.interface.js';
import type { TriageIssuesInput, TriageIssuesResult, IssueCluster } from './types.js';

/** Maximum characters of an issue body included in the AI prompt. */
const MAX_BODY_LENGTH = 200;

const CLUSTER_SCHEMA = {
  type: 'object',
  properties: {
    clusters: {
      type: 'array',
      description: 'Semantically grouped issue clusters',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Short name for this cluster (2-5 words)' },
          description: { type: 'string', description: 'One-sentence summary of the cluster theme' },
          issueNumbers: {
            type: 'array',
            description: 'Issue numbers belonging to this cluster',
            items: { type: 'number' },
          },
        },
        required: ['name', 'description', 'issueNumbers'],
        additionalProperties: false,
      },
    },
  },
  required: ['clusters'],
  additionalProperties: false,
} as const;

@injectable()
export class TriageIssuesUseCase {
  constructor(
    @inject('IExternalIssueFetcher')
    private readonly issueFetcher: IExternalIssueFetcher,
    @inject('IStructuredAgentCaller')
    private readonly structuredCaller: IStructuredAgentCaller
  ) {}

  async execute(input: TriageIssuesInput): Promise<TriageIssuesResult> {
    const issues = await this.issueFetcher.listIssues({
      repo: input.repo,
      labels: input.labels,
      limit: input.limit,
    });

    if (issues.length === 0) {
      return { issues: [], clusters: [] };
    }

    const prompt = this.buildClusteringPrompt(issues);
    const result = await this.structuredCaller.call<{ clusters: IssueCluster[] }>(
      prompt,
      CLUSTER_SCHEMA,
      { maxTurns: 10, allowedTools: [], silent: true }
    );

    return { issues, clusters: result.clusters };
  }

  private buildClusteringPrompt(issues: ExternalIssue[]): string {
    const issueList = issues
      .map((issue) => {
        const body = this.truncateBody(issue.description);
        return `- #${issue.number}: ${issue.title}${body ? `\n  ${body}` : ''}`;
      })
      .join('\n');

    return `Analyze the following GitHub issues and group them into semantically related clusters.

Issues:
${issueList}

Instructions:
- Group issues by semantic similarity (shared theme, component, or concern)
- Every issue must appear in exactly one cluster
- Aim for 3-7 clusters (fewer for small issue sets, more for larger ones)
- Each cluster needs a short descriptive name and a one-sentence description
- Return the result as JSON matching the provided schema`;
  }

  private truncateBody(body: string): string {
    if (!body) return '';
    if (body.length <= MAX_BODY_LENGTH) return body;
    return `${body.slice(0, MAX_BODY_LENGTH)}...`;
  }
}

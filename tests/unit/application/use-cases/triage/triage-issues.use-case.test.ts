/**
 * TriageIssuesUseCase — Unit Tests (RED phase)
 *
 * Tests the fetch → cluster pipeline. Interactive review is NOT part of the
 * use case (it belongs in the CLI layer per Clean Architecture).
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IStructuredAgentCaller } from '@/application/ports/output/agents/structured-agent-caller.interface.js';
import type {
  IExternalIssueFetcher,
  ExternalIssue,
} from '@/application/ports/output/services/external-issue-fetcher.interface.js';
import { TriageIssuesUseCase } from '@/application/use-cases/triage/triage-issues.use-case.js';
import type { TriageIssuesInput, IssueCluster } from '@/application/use-cases/triage/types.js';

function makeIssue(overrides: Partial<ExternalIssue> & { number: number }): ExternalIssue {
  return {
    title: `Issue #${overrides.number}`,
    description: 'Default issue body',
    labels: [],
    url: `https://github.com/org/repo/issues/${overrides.number}`,
    source: 'github',
    ...overrides,
  };
}

describe('TriageIssuesUseCase', () => {
  let mockIssueFetcher: IExternalIssueFetcher;
  let mockStructuredCaller: IStructuredAgentCaller;
  let useCase: TriageIssuesUseCase;

  const defaultInput: TriageIssuesInput = {
    repositoryPath: '/path/to/repo',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockIssueFetcher = {
      fetchGitHubIssue: vi.fn(),
      fetchJiraTicket: vi.fn(),
      listIssues: vi.fn(),
    } as any;
    mockStructuredCaller = { call: vi.fn() } as any;
    useCase = new TriageIssuesUseCase(mockIssueFetcher, mockStructuredCaller);
  });

  describe('execute', () => {
    it('should fetch issues and return AI-generated clusters', async () => {
      const issues: ExternalIssue[] = [
        makeIssue({ number: 1, title: 'Fix login bug', description: 'Login fails on mobile' }),
        makeIssue({ number: 2, title: 'Add OAuth support', description: 'Support Google OAuth' }),
        makeIssue({
          number: 3,
          title: 'Improve error messages',
          description: 'Error messages are vague',
        }),
      ];
      const clusters: IssueCluster[] = [
        { name: 'Authentication', description: 'Auth-related issues', issueNumbers: [1, 2] },
        { name: 'UX improvements', description: 'User experience fixes', issueNumbers: [3] },
      ];

      (mockIssueFetcher.listIssues as any).mockResolvedValue(issues);
      (mockStructuredCaller.call as any).mockResolvedValue({ clusters });

      const result = await useCase.execute(defaultInput);

      expect(result.issues).toEqual(issues);
      expect(result.clusters).toEqual(clusters);
    });

    it('should return empty clusters when no issues are found', async () => {
      (mockIssueFetcher.listIssues as any).mockResolvedValue([]);

      const result = await useCase.execute(defaultInput);

      expect(result.issues).toEqual([]);
      expect(result.clusters).toEqual([]);
      expect(mockStructuredCaller.call).not.toHaveBeenCalled();
    });

    it('should forward repo, labels, and limit options to listIssues', async () => {
      const input: TriageIssuesInput = {
        repositoryPath: '/path/to/repo',
        repo: 'owner/repo',
        labels: ['bug', 'enhancement'],
        limit: 50,
      };

      (mockIssueFetcher.listIssues as any).mockResolvedValue([]);

      await useCase.execute(input);

      expect(mockIssueFetcher.listIssues).toHaveBeenCalledWith({
        repo: 'owner/repo',
        labels: ['bug', 'enhancement'],
        limit: 50,
      });
    });

    it('should propagate IStructuredAgentCaller errors', async () => {
      const issues = [makeIssue({ number: 1 })];
      (mockIssueFetcher.listIssues as any).mockResolvedValue(issues);
      (mockStructuredCaller.call as any).mockRejectedValue(new Error('LLM API error'));

      await expect(useCase.execute(defaultInput)).rejects.toThrow('LLM API error');
    });

    it('should pass correct JSON schema to IStructuredAgentCaller', async () => {
      const issues = [makeIssue({ number: 1 })];
      (mockIssueFetcher.listIssues as any).mockResolvedValue(issues);
      (mockStructuredCaller.call as any).mockResolvedValue({ clusters: [] });

      await useCase.execute(defaultInput);

      expect(mockStructuredCaller.call).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'object',
          properties: expect.objectContaining({
            clusters: expect.objectContaining({
              type: 'array',
              items: expect.objectContaining({
                type: 'object',
                properties: expect.objectContaining({
                  name: expect.objectContaining({ type: 'string' }),
                  description: expect.objectContaining({ type: 'string' }),
                  issueNumbers: expect.objectContaining({
                    type: 'array',
                    items: expect.objectContaining({ type: 'number' }),
                  }),
                }),
                required: expect.arrayContaining(['name', 'description', 'issueNumbers']),
              }),
            }),
          }),
        }),
        expect.objectContaining({ allowedTools: [], silent: true })
      );
    });

    it('should include issue numbers and titles in the AI prompt', async () => {
      const issues = [
        makeIssue({ number: 10, title: 'Fix auth flow' }),
        makeIssue({ number: 20, title: 'Add dark mode' }),
      ];
      (mockIssueFetcher.listIssues as any).mockResolvedValue(issues);
      (mockStructuredCaller.call as any).mockResolvedValue({ clusters: [] });

      await useCase.execute(defaultInput);

      const prompt = (mockStructuredCaller.call as any).mock.calls[0][0] as string;
      expect(prompt).toContain('#10');
      expect(prompt).toContain('Fix auth flow');
      expect(prompt).toContain('#20');
      expect(prompt).toContain('Add dark mode');
    });

    it('should truncate long issue bodies in the prompt', async () => {
      const longBody = 'a'.repeat(500);
      const issues = [makeIssue({ number: 1, description: longBody })];
      (mockIssueFetcher.listIssues as any).mockResolvedValue(issues);
      (mockStructuredCaller.call as any).mockResolvedValue({ clusters: [] });

      await useCase.execute(defaultInput);

      const prompt = (mockStructuredCaller.call as any).mock.calls[0][0] as string;
      expect(prompt).not.toContain(longBody);
      expect(prompt).toContain('...');
    });
  });
});

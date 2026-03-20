/**
 * Doctor Diagnose Use Case
 *
 * Orchestrates the shep doctor workflow:
 * 1. Collect diagnostic context (failed agent runs, version, system info)
 * 2. Create a structured GitHub issue on shep-ai/cli
 * 3. Optionally attempt a fix via AI agent
 * 4. Open a PR with the fix (direct push for maintainers, fork for contributors)
 *
 * Following Clean Architecture: all external operations are injected via interfaces.
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IVersionService } from '../../ports/output/services/version-service.interface.js';
import type { IGitHubIssueService } from '../../ports/output/services/github-issue-service.interface.js';
import type { IGitHubRepositoryService } from '../../ports/output/services/github-repository-service.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import type { IAgentExecutorProvider } from '../../ports/output/agents/agent-executor-provider.interface.js';
import type { ExecFunction } from '../../../infrastructure/services/git/worktree.service.js';
import type {
  DoctorDiagnosticReport,
  FailedRunSummary,
  SystemInfo,
  AgentRun,
} from '../../../domain/generated/output.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface DoctorDiagnoseInput {
  description: string;
  fix: boolean;
  workdir?: string;
}

export interface DoctorDiagnoseResult {
  diagnosticReport: DoctorDiagnosticReport;
  issueUrl: string;
  issueNumber: number;
  prUrl?: string;
  flowType?: 'maintainer' | 'contributor';
  error?: string;
  cleanedUp: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SHEP_REPO = 'shep-ai/cli';
const MAX_FAILED_RUNS = 10;
const ISSUE_LABELS = ['bug', 'shep-doctor'];

// ---------------------------------------------------------------------------
// Use Case
// ---------------------------------------------------------------------------

@injectable()
export class DoctorDiagnoseUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepo: IAgentRunRepository,
    @inject('IVersionService')
    private readonly versionService: IVersionService,
    @inject('IGitHubIssueService')
    private readonly issueService: IGitHubIssueService,
    @inject('IGitHubRepositoryService')
    private readonly repoService: IGitHubRepositoryService,
    @inject('IGitPrService')
    private readonly prService: IGitPrService,
    @inject('IAgentExecutorProvider')
    private readonly agentExecutorProvider: IAgentExecutorProvider,
    @inject('ExecFunction')
    private readonly execFile: ExecFunction
  ) {}

  async execute(input: DoctorDiagnoseInput): Promise<DoctorDiagnoseResult> {
    // Step 1: Collect diagnostics
    const diagnosticReport = await this.collectDiagnostics(input.description);

    // Step 2: Create GitHub issue
    const issueTitle = this.formatIssueTitle(input.description);
    const issueBody = this.formatIssueBody(diagnosticReport);
    const { url: issueUrl, number: issueNumber } = await this.issueService.createIssue(
      SHEP_REPO,
      issueTitle,
      issueBody,
      ISSUE_LABELS
    );

    // Step 3: If no fix requested, return early
    if (!input.fix) {
      return {
        diagnosticReport,
        issueUrl,
        issueNumber,
        cleanedUp: false,
      };
    }

    // Step 4: Attempt fix
    return this.attemptFix(input, diagnosticReport, issueUrl, issueNumber);
  }

  // -------------------------------------------------------------------------
  // Diagnostic Collection (Task 10)
  // -------------------------------------------------------------------------

  private async collectDiagnostics(userDescription: string): Promise<DoctorDiagnosticReport> {
    const [failedRunSummaries, systemInfo, cliVersion] = await Promise.all([
      this.collectFailedRuns(),
      this.collectSystemInfo(),
      Promise.resolve(this.versionService.getVersion().version),
    ]);

    return {
      userDescription,
      failedRunSummaries,
      systemInfo,
      cliVersion,
    };
  }

  private async collectFailedRuns(): Promise<FailedRunSummary[]> {
    const allRuns = await this.agentRunRepo.list();

    return allRuns
      .filter((run) => run.status === AgentRunStatus.failed)
      .slice(0, MAX_FAILED_RUNS)
      .map((run) => this.sanitizeRunSummary(run));
  }

  private sanitizeRunSummary(run: AgentRun): FailedRunSummary {
    return {
      agentType: run.agentType,
      agentName: run.agentName,
      error: run.error ?? 'Unknown error',
      timestamp:
        run.createdAt instanceof Date ? run.createdAt.toISOString() : String(run.createdAt),
    };
  }

  private async collectSystemInfo(): Promise<SystemInfo> {
    let ghVersion = 'unknown';
    try {
      const { stdout } = await this.execFile('gh', ['--version']);
      ghVersion = stdout.trim();
    } catch {
      // gh not installed or not available — use fallback
    }

    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      ghVersion,
    };
  }

  // -------------------------------------------------------------------------
  // Issue Formatting (Task 11)
  // -------------------------------------------------------------------------

  private formatIssueTitle(description: string): string {
    const firstLine = description.split('\n')[0].trim();
    const truncated = firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
    return `[shep doctor] ${truncated}`;
  }

  private formatIssueBody(report: DoctorDiagnosticReport): string {
    const sections: string[] = [];

    sections.push('## Problem Description\n');
    sections.push(report.userDescription);

    sections.push('\n## Environment\n');
    sections.push(`- **shep CLI version:** ${report.cliVersion}`);
    sections.push(`- **Node.js:** ${report.systemInfo.nodeVersion}`);
    sections.push(`- **Platform:** ${report.systemInfo.platform} (${report.systemInfo.arch})`);
    sections.push(`- **gh CLI:** ${report.systemInfo.ghVersion}`);

    if (report.failedRunSummaries.length > 0) {
      sections.push('\n## Recent Failed Agent Runs\n');
      for (const run of report.failedRunSummaries) {
        sections.push(`### ${run.agentName} (${run.agentType})`);
        sections.push(`- **Error:** ${run.error}`);
        sections.push(`- **Timestamp:** ${run.timestamp}`);
        sections.push('');
      }
    }

    sections.push('\n---\n');
    sections.push('_Reported via `shep doctor`_');

    return sections.join('\n');
  }

  // -------------------------------------------------------------------------
  // Fix Workflow (Task 11)
  // -------------------------------------------------------------------------

  private async attemptFix(
    input: DoctorDiagnoseInput,
    diagnosticReport: DoctorDiagnosticReport,
    issueUrl: string,
    issueNumber: number
  ): Promise<DoctorDiagnoseResult> {
    const isUserWorkdir = !!input.workdir;
    const workdir = input.workdir ?? path.join(tmpdir(), `shep-doctor-${randomUUID()}`);

    // Use a mutable result object so finally block can update cleanedUp
    const result: DoctorDiagnoseResult = {
      diagnosticReport,
      issueUrl,
      issueNumber,
      cleanedUp: false,
    };

    try {
      // Ensure working directory exists
      await mkdir(workdir, { recursive: true });

      // Check push access (fall back to contributor flow on error)
      let hasPushAccess = false;
      try {
        hasPushAccess = await this.repoService.checkPushAccess(SHEP_REPO);
      } catch {
        // NFR-9: fall back to fork path on any detection failure
      }

      const flowType: 'maintainer' | 'contributor' = hasPushAccess ? 'maintainer' : 'contributor';
      result.flowType = flowType;

      // Clone repository (direct or via fork)
      let repoToClone = SHEP_REPO;
      if (flowType === 'contributor') {
        const { nameWithOwner } = await this.repoService.forkRepository(SHEP_REPO);
        repoToClone = nameWithOwner;
      }

      await this.repoService.cloneRepository(repoToClone, workdir, undefined);

      // Create fix branch
      const branchName = `doctor/fix-${issueNumber}`;
      await this.execFile('git', ['checkout', '-b', branchName], {
        cwd: workdir,
      });

      // Invoke AI agent
      try {
        const executor = await this.agentExecutorProvider.getExecutor();
        const prompt = this.buildFixPrompt(diagnosticReport, issueNumber);
        await executor.execute(prompt, { cwd: workdir });
      } catch (agentError) {
        result.error = `Fix attempt failed: ${(agentError as Error).message}`;
        return result;
      }

      // Check if agent produced changes
      const hasChanges = await this.prService.hasUncommittedChanges(workdir);
      if (!hasChanges) {
        result.error = 'Fix attempt produced no changes';
        return result;
      }

      // Commit, push, and create PR
      await this.prService.commitAll(
        workdir,
        `fix: address issue #${issueNumber} reported via shep doctor`
      );
      await this.prService.push(workdir, branchName, true);

      const prResult = await this.prService.createPrFromArgs(workdir, {
        title: `fix: address shep doctor issue #${issueNumber}`,
        body: `## Summary\n\nAutomated fix attempt for #${issueNumber}.\n\nThis PR was created by \`shep doctor\` after diagnosing a reported issue.\n\nRelates to #${issueNumber}`,
        labels: ['shep-doctor'],
        base: 'main',
        repo: flowType === 'contributor' ? SHEP_REPO : undefined,
      });

      result.prUrl = prResult.url;
      return result;
    } finally {
      // Cleanup temp directory (unless user specified --workdir)
      if (!isUserWorkdir) {
        try {
          await rm(workdir, { recursive: true, force: true });
          result.cleanedUp = true;
        } catch {
          // Best-effort cleanup
        }
      }
    }
  }

  private buildFixPrompt(report: DoctorDiagnosticReport, issueNumber: number): string {
    const lines: string[] = [];
    lines.push(`You are fixing issue #${issueNumber} in the shep-ai/cli codebase.`);
    lines.push('');
    lines.push('## Problem Description');
    lines.push(report.userDescription);
    lines.push('');

    if (report.failedRunSummaries.length > 0) {
      lines.push('## Error Context');
      for (const run of report.failedRunSummaries) {
        lines.push(`- Agent: ${run.agentName} (${run.agentType})`);
        lines.push(`  Error: ${run.error}`);
      }
      lines.push('');
    }

    lines.push('## Instructions');
    lines.push('1. Analyze the codebase to identify the root cause');
    lines.push('2. Implement a fix for the identified issue');
    lines.push('3. Run tests to verify the fix works');
    lines.push('4. Keep changes minimal and focused');

    return lines.join('\n');
  }
}

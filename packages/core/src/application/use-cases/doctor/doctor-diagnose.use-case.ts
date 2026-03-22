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
import { tmpdir, homedir } from 'node:os';
import { mkdir, rm, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '../../ports/output/agents/phase-timing-repository.interface.js';
import type { IVersionService } from '../../ports/output/services/version-service.interface.js';
import type { IGitHubIssueService } from '../../ports/output/services/github-issue-service.interface.js';
import type { IGitHubRepositoryService } from '../../ports/output/services/github-repository-service.interface.js';
import type { IGitPrService } from '../../ports/output/services/git-pr-service.interface.js';
import type { IAgentExecutorProvider } from '../../ports/output/agents/agent-executor-provider.interface.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { ExecFunction } from '../../../infrastructure/services/git/worktree.service.js';
import type {
  DoctorDiagnosticReport,
  FailedRunSummary,
  SystemInfo,
  AgentRun,
  AgentRunDetail,
  WorkerLogEntry,
} from '../../../domain/generated/output.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface DoctorDiagnoseInput {
  description: string;
  fix: boolean;
  workdir?: string;
  featureId?: string;
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
const MAX_AGENT_RUN_DETAILS = 10;
const MAX_WORKER_LOG_CHARS = 50_000;
const MAX_PROMPT_CHARS = 10_000;
const MAX_RESULT_CHARS = 10_000;
const MAX_CONVERSATION_CHARS = 20_000;
const MAX_PLAN_CHARS = 20_000;

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
    private readonly execFile: ExecFunction,
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IPhaseTimingRepository')
    private readonly phaseTimingRepo: IPhaseTimingRepository
  ) {}

  async execute(input: DoctorDiagnoseInput): Promise<DoctorDiagnoseResult> {
    // Step 1: Collect diagnostics
    const diagnosticReport = await this.collectDiagnostics(input.description, input.featureId);

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

  private async collectDiagnostics(
    userDescription: string,
    featureId?: string
  ): Promise<DoctorDiagnosticReport> {
    let resolvedFeatureId: string | undefined;
    let featureName: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let feature: any | undefined;
    if (featureId) {
      feature =
        (await this.featureRepo.findById(featureId)) ??
        (await this.featureRepo.findByIdPrefix(featureId));
      if (feature) {
        resolvedFeatureId = feature.id;
        featureName = feature.name;
      }
    }

    // Fetch all runs once — used for both failed summaries and enrichment
    const allRuns = await this.agentRunRepo.list();

    const [failedRunSummaries, systemInfo, cliVersion] = await Promise.all([
      Promise.resolve(this.filterFailedRuns(allRuns, resolvedFeatureId)),
      this.collectSystemInfo(),
      Promise.resolve(this.versionService.getVersion().version),
    ]);

    const report: DoctorDiagnosticReport = {
      userDescription,
      failedRunSummaries,
      systemInfo,
      cliVersion,
      featureId: resolvedFeatureId,
      featureName,
    };

    // Enrich with feature-scoped data when a feature is resolved
    if (feature) {
      report.featureLifecycle = feature.lifecycle;
      report.featureBranch = feature.branch;
      report.featureDescription = feature.description;
      report.featureWorkflowConfig = JSON.stringify({
        fast: feature.fast,
        push: feature.push,
        openPr: feature.openPr,
        approvalGates: feature.approvalGates,
      });
      if (feature.messages?.length) {
        const serialized = JSON.stringify(feature.messages);
        report.conversationMessages = this.truncate(serialized, MAX_CONVERSATION_CHARS).text;
      }
      if (feature.plan) {
        const serialized = JSON.stringify(feature.plan);
        report.featurePlan = this.truncate(serialized, MAX_PLAN_CHARS).text;
      }

      // Parallel async enrichments
      const featureRuns = allRuns.filter((r) => r.featureId === resolvedFeatureId);

      const [specYamls, workerLogs, phaseTimings] = await Promise.all([
        this.collectSpecYamls(feature.specPath),
        this.collectWorkerLogs(featureRuns),
        this.collectPhaseTimings(resolvedFeatureId!),
      ]);

      Object.assign(report, specYamls);
      report.workerLogs = workerLogs.length > 0 ? workerLogs : undefined;
      report.phaseTimings = phaseTimings;
      report.agentRunDetails = this.buildAgentRunDetails(featureRuns);
    }

    return report;
  }

  private filterFailedRuns(allRuns: AgentRun[], featureId?: string): FailedRunSummary[] {
    let filtered = allRuns.filter((run) => run.status === AgentRunStatus.failed);
    if (featureId) {
      filtered = filtered.filter((run) => run.featureId === featureId);
    }
    return filtered.slice(0, MAX_FAILED_RUNS).map((run) => this.sanitizeRunSummary(run));
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
  // Enrichment helpers
  // -------------------------------------------------------------------------

  private truncate(
    content: string,
    maxChars: number
  ): { text: string; truncated: boolean; originalLength?: number } {
    if (content.length <= maxChars) {
      return { text: content, truncated: false };
    }
    return {
      text: `${content.slice(0, maxChars)}\n... [truncated, ${content.length} chars total]`,
      truncated: true,
      originalLength: content.length,
    };
  }

  private async collectSpecYamls(
    specPath?: string
  ): Promise<Partial<DoctorDiagnosticReport>> {
    if (!specPath) return {};
    const files = [
      'spec.yaml',
      'research.yaml',
      'plan.yaml',
      'tasks.yaml',
      'feature.yaml',
    ] as const;
    const keys = [
      'specYaml',
      'researchYaml',
      'planYaml',
      'tasksYaml',
      'featureStatusYaml',
    ] as const;

    const results: Partial<DoctorDiagnosticReport> = {};
    const reads = await Promise.all(
      files.map((f) => this.readFileSafe(path.join(specPath, f)))
    );
    for (let i = 0; i < files.length; i++) {
      if (reads[i]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results as any)[keys[i]] = reads[i];
      }
    }
    return results;
  }

  private async collectWorkerLogs(featureRuns: AgentRun[]): Promise<WorkerLogEntry[]> {
    const logDir = path.join(homedir(), '.shep', 'logs');
    const entries: WorkerLogEntry[] = [];

    for (const run of featureRuns) {
      const logPath = path.join(logDir, `worker-${run.id}.log`);
      const content = await this.readFileSafe(logPath);
      if (content) {
        const { text, truncated, originalLength } = this.truncate(content, MAX_WORKER_LOG_CHARS);
        entries.push({
          agentRunId: run.id,
          agentName: run.agentName,
          content: text,
          truncated,
          originalLength,
        });
      }
    }
    return entries;
  }

  private async collectPhaseTimings(featureId: string): Promise<string | undefined> {
    try {
      const timings = await this.phaseTimingRepo.findByFeatureId(featureId);
      return timings.length > 0 ? JSON.stringify(timings) : undefined;
    } catch {
      return undefined;
    }
  }

  private buildAgentRunDetails(featureRuns: AgentRun[]): AgentRunDetail[] | undefined {
    if (featureRuns.length === 0) return undefined;
    return featureRuns.slice(0, MAX_AGENT_RUN_DETAILS).map((run) => ({
      agentType: run.agentType,
      agentName: run.agentName,
      prompt: this.truncate(run.prompt, MAX_PROMPT_CHARS).text,
      result: run.result ? this.truncate(run.result, MAX_RESULT_CHARS).text : undefined,
      error: run.error ?? undefined,
      timestamp:
        run.createdAt instanceof Date ? run.createdAt.toISOString() : String(run.createdAt),
    }));
  }

  private async readFileSafe(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return undefined;
    }
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

    if (report.featureId) {
      sections.push('\n## Feature Context\n');
      sections.push(`- **Feature ID:** ${report.featureId}`);
      if (report.featureName) sections.push(`- **Feature Name:** ${report.featureName}`);
      if (report.featureLifecycle) sections.push(`- **Lifecycle:** ${report.featureLifecycle}`);
      if (report.featureBranch) sections.push(`- **Branch:** ${report.featureBranch}`);
      if (report.featureDescription)
        sections.push(`- **Description:** ${report.featureDescription}`);
      if (report.featureWorkflowConfig)
        sections.push(`- **Workflow Config:** ${report.featureWorkflowConfig}`);
    }

    sections.push('\n## Environment\n');
    sections.push(`- **shep CLI version:** ${report.cliVersion}`);
    sections.push(`- **Node.js:** ${report.systemInfo.nodeVersion}`);
    sections.push(`- **Platform:** ${report.systemInfo.platform} (${report.systemInfo.arch})`);
    sections.push(`- **gh CLI:** ${report.systemInfo.ghVersion}`);

    if (report.failedRunSummaries.length > 0) {
      const heading = report.featureId
        ? '\n## Failed Agent Runs (feature-scoped)\n'
        : '\n## Recent Failed Agent Runs\n';
      sections.push(heading);
      for (const run of report.failedRunSummaries) {
        sections.push(`### ${run.agentName} (${run.agentType})`);
        sections.push(`- **Error:** ${run.error}`);
        sections.push(`- **Timestamp:** ${run.timestamp}`);
        sections.push('');
      }
    }

    if (report.agentRunDetails?.length) {
      sections.push('\n## Agent Run Details\n');
      for (const detail of report.agentRunDetails) {
        sections.push(
          `<details><summary>Agent: ${detail.agentName} (${detail.agentType})</summary>\n`
        );
        sections.push('### Prompt\n```\n' + detail.prompt + '\n```\n');
        if (detail.result) {
          sections.push('### Result\n```\n' + detail.result + '\n```\n');
        }
        if (detail.error) {
          sections.push('### Error\n```\n' + detail.error + '\n```\n');
        }
        sections.push('</details>\n');
      }
    }

    if (report.conversationMessages) {
      const msgCount = (report.conversationMessages.match(/"id"/g) || []).length;
      sections.push('\n## Conversation History\n');
      sections.push(`<details><summary>Messages (${msgCount} messages)</summary>\n`);
      sections.push('```json\n' + report.conversationMessages + '\n```\n');
      sections.push('</details>\n');
    }

    if (report.featurePlan) {
      sections.push('\n## Feature Plan\n');
      sections.push('<details><summary>Plan & Tasks</summary>\n');
      sections.push('```json\n' + report.featurePlan + '\n```\n');
      sections.push('</details>\n');
    }

    // Spec files
    const specEntries: [string, string | undefined][] = [
      ['spec.yaml', report.specYaml],
      ['research.yaml', report.researchYaml],
      ['plan.yaml', report.planYaml],
      ['tasks.yaml', report.tasksYaml],
      ['feature.yaml', report.featureStatusYaml],
    ];
    const hasSpecs = specEntries.some(([, v]) => v);
    if (hasSpecs) {
      sections.push('\n## Spec Files\n');
      for (const [name, content] of specEntries) {
        if (content) {
          sections.push(`<details><summary>${name}</summary>\n`);
          sections.push('```yaml\n' + content + '\n```\n');
          sections.push('</details>\n');
        }
      }
    }

    if (report.workerLogs?.length) {
      sections.push('\n## Worker Logs\n');
      for (const log of report.workerLogs) {
        const suffix = log.truncated
          ? ` (truncated, ${log.originalLength} chars total)`
          : '';
        sections.push(
          `<details><summary>Worker log: ${log.agentName} (${log.agentRunId})${suffix}</summary>\n`
        );
        sections.push('```\n' + log.content + '\n```\n');
        sections.push('</details>\n');
      }
    }

    if (report.phaseTimings) {
      sections.push('\n## Phase Timings\n');
      sections.push('<details><summary>Phase timing data</summary>\n');
      sections.push('```json\n' + report.phaseTimings + '\n```\n');
      sections.push('</details>\n');
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

# Enrich Doctor Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich `shep doctor --feature-id` to collect specs, logs, prompts, conversation history, feature plan, and phase timings — all inline in the GitHub issue body.

**Architecture:** Expand the existing `DoctorDiagnoseUseCase` with new collection methods and inject `IPhaseTimingRepository`. Add `AgentRunDetail` and `WorkerLogEntry` TypeSpec models. All new fields on `DoctorDiagnosticReport` are optional — zero impact when `--feature-id` is not provided.

**Tech Stack:** TypeSpec, TypeScript, Vitest, tsyringe DI, node:fs/promises, node:os

**Spec:** `docs/superpowers/specs/2026-03-22-doctor-rich-diagnostics-design.md`

---

## File Structure

| File | Role |
|------|------|
| `tsp/domain/value-objects/doctor-diagnostic-report.tsp` | TypeSpec models — add new fields, `AgentRunDetail`, `WorkerLogEntry` |
| `packages/core/src/domain/generated/output.ts` | Regenerated (do not hand-edit) |
| `packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts` | Use case — new collection methods, expanded formatting, new DI param |
| `tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts` | Unit tests for all new collection + formatting |
| `tests/integration/application/use-cases/doctor/doctor-workflow.test.ts` | Integration test for feature-scoped full diagnostic flow |

---

## Task 1: Expand TypeSpec Models

**Files:**
- Modify: `tsp/domain/value-objects/doctor-diagnostic-report.tsp`
- Regenerate: `packages/core/src/domain/generated/output.ts`

- [ ] **Step 1: Add `AgentRunDetail` and `WorkerLogEntry` models and expand `DoctorDiagnosticReport`**

In `tsp/domain/value-objects/doctor-diagnostic-report.tsp`, add after the existing `DoctorDiagnosticReport` closing brace:

```typespec
@doc("Detailed agent run information including prompt and result for diagnostic reporting")
model AgentRunDetail {
  @doc("Type of agent (e.g. claude-code, gemini-cli)")
  agentType: string;

  @doc("Name/identifier of the agent run")
  agentName: string;

  @doc("Input prompt sent to the agent executor")
  prompt: string;

  @doc("Final result output from the agent (if available)")
  result?: string;

  @doc("Error message if the run failed")
  error?: string;

  @doc("ISO 8601 timestamp of the run")
  timestamp: string;
}

@doc("Worker log entry for a specific agent run")
model WorkerLogEntry {
  @doc("Agent run ID this log belongs to")
  agentRunId: string;

  @doc("Name of the agent that produced this log")
  agentName: string;

  @doc("Full log file content (may be truncated)")
  content: string;

  @doc("Whether the content was truncated due to size limits")
  truncated: boolean;

  @doc("Original character count before truncation (only set when truncated)")
  originalLength?: int32;
}
```

And add these new optional fields inside the `DoctorDiagnosticReport` model, after `featureName`:

```typespec
  @doc("Feature lifecycle phase (e.g. Implementation, Review)")
  featureLifecycle?: string;

  @doc("Feature git branch name")
  featureBranch?: string;

  @doc("Feature description")
  featureDescription?: string;

  @doc("JSON-serialized feature workflow configuration (fast, push, openPr, approvalGates)")
  featureWorkflowConfig?: string;

  @doc("Raw spec.yaml content")
  specYaml?: string;

  @doc("Raw research.yaml content")
  researchYaml?: string;

  @doc("Raw plan.yaml content")
  planYaml?: string;

  @doc("Raw tasks.yaml content")
  tasksYaml?: string;

  @doc("Raw feature.yaml (status tracking) content")
  featureStatusYaml?: string;

  @doc("Detailed agent run information including prompts and results")
  agentRunDetails?: AgentRunDetail[];

  @doc("JSON-serialized conversation messages (Feature.messages[])")
  conversationMessages?: string;

  @doc("JSON-serialized feature plan (Feature.plan)")
  featurePlan?: string;

  @doc("Worker execution logs for agent runs associated with this feature")
  workerLogs?: WorkerLogEntry[];

  @doc("JSON-serialized phase timing records")
  phaseTimings?: string;
```

- [ ] **Step 2: Compile TypeSpec and verify generated output**

Run: `pnpm tsp:compile`
Expected: Compilation succeeds. Check `packages/core/src/domain/generated/output.ts` contains the new types `AgentRunDetail`, `WorkerLogEntry`, and the expanded `DoctorDiagnosticReport`.

- [ ] **Step 3: Commit**

```bash
git add tsp/domain/value-objects/doctor-diagnostic-report.tsp packages/core/src/domain/generated/
git commit -m "feat(tsp): add agent-run-detail and worker-log-entry models to doctor diagnostics"
```

---

## Task 2: Write Failing Tests for New Collection Methods

**Files:**
- Modify: `tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts`

**Important context:**
- The existing `createMocks()` helper creates all mocked dependencies. You need to add `phaseTimingRepo` mock and a `readFileFn` mock to it.
- The existing `createUseCase()` helper instantiates the use case. It must be updated to pass the new dependency.
- The use case constructor currently takes 8 params. After this change it will take 9 (adding `IPhaseTimingRepository`).

- [ ] **Step 1: Add `IPhaseTimingRepository` import, mock, and filesystem mock to test file**

At the top imports, add:
```typescript
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { PhaseTiming } from '@/domain/generated/output.js';
```

Add a `vi.mock` for `node:fs/promises` at the top level (after imports, before helpers). This lets us control what `readFile` returns in tests:
```typescript
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readFile: vi.fn().mockRejectedValue(new Error('ENOENT')),
  };
});
```

Import the mocked `readFile` so tests can override it per-test:
```typescript
import { readFile } from 'node:fs/promises';
```

In `createMocks()`, add after the `featureRepo` mock:
```typescript
  const phaseTimingRepo: Pick<IPhaseTimingRepository, 'findByFeatureId'> = {
    findByFeatureId: vi.fn<(featureId: string) => Promise<PhaseTiming[]>>().mockResolvedValue([]),
  };
```

Add `phaseTimingRepo` to the return object.

Update `createUseCase()` to pass `mocks.phaseTimingRepo as any` as the 9th argument.

- [ ] **Step 2: Run tests to verify existing tests still pass with new constructor param**

Run: `pnpm vitest run tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts`
Expected: This will FAIL because the use case constructor doesn't accept 9 params yet. That's expected — we'll fix it in Task 3.

- [ ] **Step 3: Write test — spec YAML collection**

Add inside the `feature-specific diagnostics` describe block:

```typescript
    it('should collect spec YAML files when feature has specPath', async () => {
      // Mock readFile to return content for spec files
      vi.mocked(readFile).mockImplementation(async (filePath: any) => {
        const p = String(filePath);
        if (p.endsWith('spec.yaml')) return 'name: My Feature Spec';
        if (p.endsWith('research.yaml')) return 'decisions: []';
        if (p.endsWith('plan.yaml')) return 'phases: []';
        if (p.endsWith('tasks.yaml')) return 'tasks: []';
        if (p.endsWith('feature.yaml')) return 'status: active';
        throw new Error('ENOENT');
      });

      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        specPath: '/repo/specs/042-my-feature',
        lifecycle: 'Implementation',
        branch: 'feat/my-feature',
        description: 'A test feature',
        messages: [],
        fast: false,
        push: false,
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.specYaml).toBe('name: My Feature Spec');
      expect(result.diagnosticReport.researchYaml).toBe('decisions: []');
      expect(result.diagnosticReport.planYaml).toBe('phases: []');
      expect(result.diagnosticReport.tasksYaml).toBe('tasks: []');
      expect(result.diagnosticReport.featureStatusYaml).toBe('status: active');
      expect(result.diagnosticReport.featureLifecycle).toBe('Implementation');
      expect(result.diagnosticReport.featureBranch).toBe('feat/my-feature');
      expect(result.diagnosticReport.featureDescription).toBe('A test feature');
    });
```

- [ ] **Step 4: Write test — worker log collection**

```typescript
    it('should collect worker logs for all feature-scoped agent runs', async () => {
      // Mock readFile to return log content for worker log files
      vi.mocked(readFile).mockImplementation(async (filePath: any) => {
        const p = String(filePath);
        if (p.includes('worker-r1.log')) return 'Log content for r1';
        if (p.includes('worker-r2.log')) return 'Log content for r2';
        throw new Error('ENOENT');
      });

      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc' }),
        createFailedRun('r2', { featureId: 'feat-abc' }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.workerLogs).toBeDefined();
      expect(result.diagnosticReport.workerLogs).toHaveLength(2);
      expect(result.diagnosticReport.workerLogs![0].content).toBe('Log content for r1');
      expect(result.diagnosticReport.workerLogs![1].agentRunId).toBe('r2');
    });
```

- [ ] **Step 5: Write test — agent run details collection**

```typescript
    it('should collect agent run details with prompts and results for feature-scoped runs', async () => {
      const runs: AgentRun[] = [
        createFailedRun('r1', {
          featureId: 'feat-abc',
          prompt: 'Analyze this',
          result: 'Analysis done',
        }),
        { ...createFailedRun('r2', { featureId: 'feat-abc', prompt: 'Plan this' }),
          status: AgentRunStatus.completed },
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.agentRunDetails).toBeDefined();
      expect(result.diagnosticReport.agentRunDetails!.length).toBe(2);
      expect(result.diagnosticReport.agentRunDetails![0].prompt).toBe('Analyze this');
    });
```

- [ ] **Step 6: Write test — phase timings collection**

```typescript
    it('should collect phase timings when feature is resolved', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);
      vi.mocked(mocks.phaseTimingRepo.findByFeatureId).mockResolvedValue([
        { id: 'pt-1', phaseName: 'analyze', durationMs: 5000 } as any,
      ]);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.phaseTimings).toBeDefined();
      expect(result.diagnosticReport.phaseTimings).toContain('analyze');
    });
```

- [ ] **Step 7: Write test — conversation messages and feature plan**

```typescript
    it('should include conversation messages and feature plan in report', async () => {
      const messages = [{ id: 'm1', role: 'user', content: 'Hello' }];
      const plan = { overview: 'Build X', tasks: [] };
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages,
        plan,
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      expect(result.diagnosticReport.conversationMessages).toContain('Hello');
      expect(result.diagnosticReport.featurePlan).toContain('Build X');
    });
```

- [ ] **Step 8: Write test — no feature-id regression**

```typescript
    it('should leave all enriched fields undefined when no featureId is provided', async () => {
      const result = await useCase.execute({
        description: 'general issue',
        fix: false,
      });

      expect(result.diagnosticReport.featureLifecycle).toBeUndefined();
      expect(result.diagnosticReport.featureBranch).toBeUndefined();
      expect(result.diagnosticReport.featureDescription).toBeUndefined();
      expect(result.diagnosticReport.featureWorkflowConfig).toBeUndefined();
      expect(result.diagnosticReport.specYaml).toBeUndefined();
      expect(result.diagnosticReport.researchYaml).toBeUndefined();
      expect(result.diagnosticReport.planYaml).toBeUndefined();
      expect(result.diagnosticReport.tasksYaml).toBeUndefined();
      expect(result.diagnosticReport.featureStatusYaml).toBeUndefined();
      expect(result.diagnosticReport.agentRunDetails).toBeUndefined();
      expect(result.diagnosticReport.conversationMessages).toBeUndefined();
      expect(result.diagnosticReport.featurePlan).toBeUndefined();
      expect(result.diagnosticReport.workerLogs).toBeUndefined();
      expect(result.diagnosticReport.phaseTimings).toBeUndefined();
    });
```

- [ ] **Step 9: Write test — issue body formatting with enriched data**

```typescript
    it('should include enriched sections with details tags in issue body', async () => {
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        specPath: '/repo/specs/042-my-feature',
        lifecycle: 'Implementation',
        branch: 'feat/my-feature',
        description: 'A test feature',
        messages: [{ id: 'm1', role: 'user', content: 'Hello' }],
        plan: { overview: 'Plan overview' },
        fast: false,
        push: true,
        openPr: false,
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      } as any);

      await useCase.execute({
        description: 'enriched test',
        fix: false,
        featureId: 'feat-abc',
      });

      const bodyArg = vi.mocked(mocks.issueService.createIssue).mock.calls[0][2];
      // Feature context
      expect(bodyArg).toContain('Lifecycle');
      expect(bodyArg).toContain('Implementation');
      // Details tags for large sections
      expect(bodyArg).toContain('<details>');
      expect(bodyArg).toContain('Conversation');
      expect(bodyArg).toContain('Plan');
    });
```

- [ ] **Step 10: Write test — truncation of large content**

```typescript
    it('should truncate agent run prompts exceeding MAX_PROMPT_CHARS', async () => {
      const longPrompt = 'x'.repeat(15_000);
      const runs: AgentRun[] = [
        createFailedRun('r1', { featureId: 'feat-abc', prompt: longPrompt }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);
      vi.mocked(mocks.featureRepo.findById).mockResolvedValue({
        id: 'feat-abc',
        name: 'My Feature',
        messages: [],
      } as any);

      const result = await useCase.execute({
        description: 'test',
        fix: false,
        featureId: 'feat-abc',
      });

      const detail = result.diagnosticReport.agentRunDetails![0];
      expect(detail.prompt.length).toBeLessThanOrEqual(10_100); // 10000 + truncation message
      expect(detail.prompt).toContain('[truncated');
    });
```

- [ ] **Step 11: Commit failing tests**

```bash
git add tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts
git commit -m "test(cli): add failing tests for enriched doctor diagnostics collection"
```

---

## Task 3: Implement Collection Logic in Use Case

**Files:**
- Modify: `packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts`

**Key context:**
- The use case uses `@injectable()` with `@inject('token')` decorators for DI.
- Add `readFile` from `node:fs/promises` and `homedir` from `node:os` as regular imports (not injected).
- Add `IPhaseTimingRepository` as an injected dependency.
- The `shep logs` path convention is `~/.shep/logs/worker-{agentRunId}.log`.

- [ ] **Step 1: Add new imports**

At the top of `doctor-diagnose.use-case.ts`, add:
```typescript
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import type { IPhaseTimingRepository } from '../../ports/output/agents/phase-timing-repository.interface.js';
```

Also import `AgentRunDetail` and `WorkerLogEntry` from the generated output (they'll exist after Task 1).

- [ ] **Step 2: Add truncation constants**

After the existing constants section:
```typescript
const MAX_AGENT_RUN_DETAILS = 10;
const MAX_WORKER_LOG_CHARS = 50_000;
const MAX_PROMPT_CHARS = 10_000;
const MAX_RESULT_CHARS = 10_000;
const MAX_CONVERSATION_CHARS = 20_000;
const MAX_PLAN_CHARS = 20_000;
```

- [ ] **Step 3: Add `IPhaseTimingRepository` to constructor**

Add as the 9th constructor parameter:
```typescript
    @inject('IPhaseTimingRepository')
    private readonly phaseTimingRepo: IPhaseTimingRepository,
```

- [ ] **Step 4: Add `truncate` helper method**

```typescript
  private truncate(content: string, maxChars: number): { text: string; truncated: boolean; originalLength?: number } {
    if (content.length <= maxChars) {
      return { text: content, truncated: false };
    }
    return {
      text: `${content.slice(0, maxChars)}\n... [truncated, ${content.length} chars total]`,
      truncated: true,
      originalLength: content.length,
    };
  }
```

- [ ] **Step 5: Expand `collectDiagnostics` method**

Replace the current `collectDiagnostics` method body. After resolving the feature (existing code), add parallel collection of new data:

```typescript
  private async collectDiagnostics(
    userDescription: string,
    featureId?: string
  ): Promise<DoctorDiagnosticReport> {
    let resolvedFeatureId: string | undefined;
    let featureName: string | undefined;
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
      // Synchronous extractions from feature entity
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
```

- [ ] **Step 6: Refactor `collectFailedRuns` to `filterFailedRuns`**

The existing `collectFailedRuns` calls `this.agentRunRepo.list()` internally. Since we now fetch all runs once in `collectDiagnostics`, refactor it to accept the runs array:

```typescript
  private filterFailedRuns(allRuns: AgentRun[], featureId?: string): FailedRunSummary[] {
    let filtered = allRuns.filter((run) => run.status === AgentRunStatus.failed);
    if (featureId) {
      filtered = filtered.filter((run) => run.featureId === featureId);
    }
    return filtered.slice(0, MAX_FAILED_RUNS).map((run) => this.sanitizeRunSummary(run));
  }
```

Delete the old `collectFailedRuns` method.

- [ ] **Step 7: Add `collectSpecYamls` method**

(Note: subsequent steps renumbered from original)

```typescript
  private async collectSpecYamls(
    specPath?: string
  ): Promise<Partial<DoctorDiagnosticReport>> {
    if (!specPath) return {};
    const files = ['spec.yaml', 'research.yaml', 'plan.yaml', 'tasks.yaml', 'feature.yaml'] as const;
    const keys = ['specYaml', 'researchYaml', 'planYaml', 'tasksYaml', 'featureStatusYaml'] as const;

    const results: Partial<DoctorDiagnosticReport> = {};
    const reads = await Promise.all(
      files.map((f) => this.readFileSafe(path.join(specPath, f)))
    );
    for (let i = 0; i < files.length; i++) {
      if (reads[i]) {
        (results as any)[keys[i]] = reads[i];
      }
    }
    return results;
  }
```

- [ ] **Step 7: Add `collectWorkerLogs` method**

```typescript
  private async collectWorkerLogs(
    featureRuns: AgentRun[]
  ): Promise<WorkerLogEntry[]> {
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
          originalLength: originalLength,
        });
      }
    }
    return entries;
  }
```

- [ ] **Step 8: Add `collectPhaseTimings` method**

```typescript
  private async collectPhaseTimings(featureId: string): Promise<string | undefined> {
    try {
      const timings = await this.phaseTimingRepo.findByFeatureId(featureId);
      return timings.length > 0 ? JSON.stringify(timings) : undefined;
    } catch {
      return undefined;
    }
  }
```

- [ ] **Step 9: Add `buildAgentRunDetails` method**

```typescript
  private buildAgentRunDetails(featureRuns: AgentRun[]): AgentRunDetail[] | undefined {
    if (featureRuns.length === 0) return undefined;
    return featureRuns.slice(0, MAX_AGENT_RUN_DETAILS).map((run) => ({
      agentType: run.agentType,
      agentName: run.agentName,
      prompt: this.truncate(run.prompt, MAX_PROMPT_CHARS).text,
      result: run.result ? this.truncate(run.result, MAX_RESULT_CHARS).text : undefined,
      error: run.error ?? undefined,
      timestamp: run.createdAt instanceof Date ? run.createdAt.toISOString() : String(run.createdAt),
    }));
  }
```

- [ ] **Step 10: Add `readFileSafe` helper**

```typescript
  private async readFileSafe(filePath: string): Promise<string | undefined> {
    try {
      return await readFile(filePath, 'utf-8');
    } catch {
      return undefined;
    }
  }
```

- [ ] **Step 11: Run unit tests**

Run: `pnpm vitest run tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts`
Expected: All new tests from Task 2 should pass. All existing tests should still pass.

- [ ] **Step 12: Commit**

```bash
git add packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts
git commit -m "feat(cli): add enriched diagnostic collection to doctor use case"
```

---

## Task 4: Expand Issue Body Formatting

**Files:**
- Modify: `packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts`

- [ ] **Step 1: Expand `formatIssueBody` with new sections**

Replace the `formatIssueBody` method. Keep existing sections, add new ones. All new large sections use `<details>` collapse:

```typescript
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
      if (report.featureDescription) sections.push(`- **Description:** ${report.featureDescription}`);
      if (report.featureWorkflowConfig) sections.push(`- **Workflow Config:** ${report.featureWorkflowConfig}`);
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
        sections.push(`<details><summary>Agent: ${detail.agentName} (${detail.agentType})</summary>\n`);
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
      sections.push(`\n## Conversation History\n`);
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
        const suffix = log.truncated ? ` (truncated, ${log.originalLength} chars total)` : '';
        sections.push(`<details><summary>Worker log: ${log.agentName} (${log.agentRunId})${suffix}</summary>\n`);
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
```

- [ ] **Step 2: Run unit tests**

Run: `pnpm vitest run tests/unit/application/use-cases/doctor/doctor-diagnose.use-case.test.ts`
Expected: All tests pass, including the formatting test from Task 2 Step 9.

- [ ] **Step 3: Commit**

```bash
git add packages/core/src/application/use-cases/doctor/doctor-diagnose.use-case.ts
git commit -m "feat(cli): expand doctor issue body with enriched diagnostic sections"
```

---

## Task 5: Update Integration Tests

**Files:**
- Modify: `tests/integration/application/use-cases/doctor/doctor-workflow.test.ts`

- [ ] **Step 1: Add `IPhaseTimingRepository` mock to integration test**

Same pattern as Task 2 Step 1 — add the import and mock, update the constructor call. The integration test file has its own `createMocks()` and `createUseCase()` functions that mirror the unit test helpers.

- [ ] **Step 2: Add integration test for feature-scoped full diagnostic flow**

```typescript
  describe('feature-scoped rich diagnostics', () => {
    it('should produce enriched report with all feature context', async () => {
      const feature = {
        id: 'feat-rich',
        name: 'Rich Feature',
        specPath: '/nonexistent/specs/042-rich', // won't find files — that's OK (best-effort)
        lifecycle: 'Review',
        branch: 'feat/rich',
        description: 'Feature with full context',
        messages: [{ id: 'm1', role: 'user', content: 'Start' }],
        plan: { overview: 'Implement rich diagnostics', tasks: [] },
        fast: false,
        push: false,
        openPr: true,
        approvalGates: { allowPrd: true, allowPlan: false, allowMerge: false },
      } as any;

      vi.mocked(mocks.featureRepo.findById).mockResolvedValue(feature);

      const runs = [
        createFailedAgentRun('r1', { featureId: 'feat-rich', prompt: 'Do analysis', result: 'Done' }),
      ];
      vi.mocked(mocks.agentRunRepo.list).mockResolvedValue(runs);

      const result = await useCase.execute({
        description: 'full context test',
        fix: false,
        featureId: 'feat-rich',
      });

      const report = result.diagnosticReport;
      expect(report.featureId).toBe('feat-rich');
      expect(report.featureLifecycle).toBe('Review');
      expect(report.featureBranch).toBe('feat/rich');
      expect(report.conversationMessages).toContain('Start');
      expect(report.featurePlan).toContain('rich diagnostics');
      expect(report.agentRunDetails).toHaveLength(1);
      expect(report.agentRunDetails![0].prompt).toBe('Do analysis');
      expect(report.featureWorkflowConfig).toContain('openPr');
    });
  });
```

- [ ] **Step 3: Run integration tests**

Run: `pnpm vitest run tests/integration/application/use-cases/doctor/doctor-workflow.test.ts`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/application/use-cases/doctor/doctor-workflow.test.ts
git commit -m "test(cli): add integration test for enriched doctor diagnostics"
```

---

## Task 6: Run Full Validation

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Run validate (lint + format + typecheck + tsp)**

Run: `pnpm validate`
Expected: No errors.

- [ ] **Step 3: Fix any issues found**

If any test or lint failures, fix them and re-run.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix(cli): address lint and test issues from enriched diagnostics"
```

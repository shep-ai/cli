/**
 * Implement Node — Phase-Level Orchestrator
 *
 * Reads plan.yaml and tasks.yaml, then executes each phase by building
 * a focused implementation prompt and calling the executor. Parallel
 * phases spawn concurrent executor calls. Progress is tracked in
 * feature.yaml between phases.
 */

import yaml from 'js-yaml';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { interrupt, isGraphBubbleUp } from '@langchain/langgraph';
import type { IAgentExecutor } from '@/application/ports/output/agents/agent-executor.interface.js';
import type { FeatureAgentState } from '../state.js';
import {
  createNodeLogger,
  readSpecFile,
  buildExecutorOptions,
  shouldInterrupt,
  safeYamlLoad,
  retryExecute,
  getCompletedPhases,
  markPhaseComplete,
} from './node-helpers.js';
import { reportNodeStart } from '../heartbeat.js';
import { recordPhaseStart, recordPhaseEnd } from '../phase-timing-context.js';
import {
  buildImplementPhasePrompt,
  type PlanPhase,
  type PlanYaml,
  type PhaseTask,
  type TasksYaml,
} from './prompts/implement.prompt.js';

/**
 * Update feature.yaml with current implementation progress.
 * Silently no-ops if the file is missing or unparseable.
 */
function updateFeatureProgress(
  specDir: string,
  completedCount: number,
  totalCount: number,
  currentPhase: string,
  currentTaskId: string | null,
  log: ReturnType<typeof createNodeLogger>
): void {
  try {
    const content = readSpecFile(specDir, 'feature.yaml');
    if (!content) return;

    const data = yaml.load(content) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return;

    const status = (data.status ?? {}) as Record<string, unknown>;
    data.status = {
      ...status,
      phase: currentPhase,
      progress: {
        completed: completedCount,
        total: totalCount,
        percentage: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      },
      currentTask: currentTaskId,
      lastUpdated: new Date().toISOString(),
      lastUpdatedBy: 'feature-agent:implement',
    };

    writeFileSync(
      join(specDir, 'feature.yaml'),
      yaml.dump(data, { indent: 2, lineWidth: -1 }),
      'utf-8'
    );
  } catch (err) {
    log.error(`Failed to update feature.yaml: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export function createImplementNode(executor: IAgentExecutor) {
  const log = createNodeLogger('implement');

  return async (state: FeatureAgentState): Promise<Partial<FeatureAgentState>> => {
    log.info('Starting implementation phase orchestration');
    reportNodeStart('implement');
    const startTime = Date.now();
    const messages: string[] = [];

    // Record top-level implement phase timing (sub-phases are recorded individually below)
    const implementTimingId = await recordPhaseStart('implement');

    try {
      // --- Parse plan & tasks ---
      const planContent = readSpecFile(state.specDir, 'plan.yaml');
      const tasksContent = readSpecFile(state.specDir, 'tasks.yaml');

      if (!planContent || !tasksContent) {
        const msg = 'Missing plan.yaml or tasks.yaml — cannot implement';
        log.error(msg);
        return { currentNode: 'implement', error: msg, messages: [`[implement] Error: ${msg}`] };
      }

      const planData = safeYamlLoad(planContent) as PlanYaml;
      const tasksData = safeYamlLoad(tasksContent) as TasksYaml;

      if (!planData?.phases?.length || !tasksData?.tasks?.length) {
        const msg = 'Empty phases or tasks — nothing to implement';
        log.error(msg);
        return { currentNode: 'implement', error: msg, messages: [`[implement] Error: ${msg}`] };
      }

      const taskMap = new Map(tasksData.tasks.map((t) => [t.id, t]));
      const totalTasks = tasksData.tasks.length;
      let completedTasks = 0;
      const totalPhases = planData.phases.length;

      // --- Check for completed phases (skip on resume) ---
      const completedPhaseIds = getCompletedPhases(state.specDir);
      const retryOpts = { logger: log };

      // --- Execute phases in order ---
      for (let i = 0; i < totalPhases; i++) {
        const phase = planData.phases[i];
        const isLastPhase = i === totalPhases - 1;
        // Resolve tasks: use explicit taskIds if present, otherwise match by phaseId
        const phaseTasks = phase.taskIds?.length
          ? phase.taskIds
              .map((id) => taskMap.get(id))
              .filter((t): t is PhaseTask => t !== undefined)
          : tasksData.tasks.filter((t) => t.phaseId === phase.id);

        // Skip already-completed phases
        if (completedPhaseIds.includes(phase.id)) {
          completedTasks += phaseTasks.length;
          log.info(`Phase ${phase.id} "${phase.name}" — already complete, skipping`);
          continue;
        }

        if (phaseTasks.length === 0) {
          log.info(`Phase ${phase.id} "${phase.name}" — no tasks, skipping`);
          continue;
        }

        log.info(
          `Phase ${phase.id} "${phase.name}" — ${phaseTasks.length} task(s), parallel: ${phase.parallel}`
        );
        updateFeatureProgress(
          state.specDir,
          completedTasks,
          totalTasks,
          `implementing-${phase.id}`,
          phaseTasks[0].id,
          log
        );

        const options = buildExecutorOptions(state);
        const promptContext = { isLastPhase, phaseIndex: i, totalPhases };
        const phaseStartTime = Date.now();
        const phaseTimingId = await recordPhaseStart(`implement:${phase.id}`);

        if (phase.parallel && phaseTasks.length > 1) {
          // Parallel: one executor call per task
          log.info(`Spawning ${phaseTasks.length} parallel executor calls`);

          const results = await Promise.all(
            phaseTasks.map((task) => {
              const singleTaskPhase: PlanPhase = {
                ...phase,
                taskIds: [task.id],
              };
              const prompt = buildImplementPhasePrompt(
                state,
                singleTaskPhase,
                [task],
                promptContext
              );
              log.info(`  [parallel] Task ${task.id}: "${task.title}" — ${prompt.length} chars`);
              return retryExecute(executor, prompt, options, retryOpts);
            })
          );

          for (let j = 0; j < results.length; j++) {
            log.info(
              `  [parallel] Task ${phaseTasks[j].id} complete (${results[j].result.length} chars)`
            );
          }
        } else {
          // Sequential: single executor call with all phase tasks
          const prompt = buildImplementPhasePrompt(state, phase, phaseTasks, promptContext);
          log.info(`Executing phase prompt — ${prompt.length} chars`);
          const result = await retryExecute(executor, prompt, options, retryOpts);
          log.info(`Phase complete (${result.result.length} chars)`);
        }

        const phaseDurationMs = Date.now() - phaseStartTime;
        await recordPhaseEnd(phaseTimingId, phaseDurationMs);

        completedTasks += phaseTasks.length;
        markPhaseComplete(state.specDir, phase.id, log);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        messages.push(
          `[implement] Phase ${phase.id} "${phase.name}" — ${phaseTasks.length} task(s) done (${elapsed}s)`
        );
        updateFeatureProgress(
          state.specDir,
          completedTasks,
          totalTasks,
          `implementing-${phase.id}`,
          null,
          log
        );
      }

      // --- Final ---
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.info(`All phases complete — ${completedTasks}/${totalTasks} tasks (${elapsed}s)`);
      updateFeatureProgress(
        state.specDir,
        totalTasks,
        totalTasks,
        'implementation-complete',
        null,
        log
      );
      messages.push(
        `[implement] Complete: ${totalTasks} tasks across ${totalPhases} phases (${elapsed}s)`
      );

      // Record top-level implement phase completion
      await recordPhaseEnd(implementTimingId, Date.now() - startTime);

      if (shouldInterrupt('implement', state.approvalGates)) {
        log.info('Interrupting for human approval');
        interrupt({
          node: 'implement',
          message: `Implementation complete: ${totalTasks} tasks across ${totalPhases} phases. Approve to finish.`,
        });
      }

      return { currentNode: 'implement', messages };
    } catch (err: unknown) {
      if (isGraphBubbleUp(err)) throw err;

      const message = err instanceof Error ? err.message : String(err);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      log.error(`${message} (after ${elapsed}s)`);

      // Throw so LangGraph does NOT checkpoint this node as "completed".
      // The worker catch block marks the run as failed, and on resume
      // LangGraph re-executes from the last successfully checkpointed node.
      throw new Error(`[implement] ${message}`);
    }
  };
}

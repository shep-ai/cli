/**
 * Graph Middleware for Automatic Node Instrumentation
 *
 * Wraps LangGraph node functions to automatically record execution steps.
 * Each node invocation creates an ExecutionStep at start, completes it
 * on success, and records failure on error.
 *
 * The ExecutionMonitor is injected into the LangGraph config so inner
 * code (e.g., CI watch/fix loop) can create sub-steps.
 */

import { ExecutionStepType } from '../../../../domain/generated/output.js';
import type { ExecutionMonitor } from './execution-monitor.js';

/**
 * Config key for accessing the ExecutionMonitor from within nodes.
 */
export const EXECUTION_MONITOR_CONFIG_KEY = 'executionMonitor';

/**
 * Config key for accessing the current parent step ID from within nodes.
 * Set by instrumentNode so wrapped nodes can create sub-steps under it.
 */
export const EXECUTION_STEP_ID_KEY = 'executionStepId';

/**
 * Node name prefixes that indicate sub-step classification.
 */
const SUB_STEP_PREFIXES = ['validate', 'repair'];

/**
 * Determine the step type based on the node name.
 */
function classifyNode(nodeName: string): ExecutionStepType {
  const baseName = nodeName.split('_')[0];
  if (SUB_STEP_PREFIXES.includes(baseName)) {
    return ExecutionStepType.subStep;
  }
  return ExecutionStepType.phase;
}

/**
 * Wraps a LangGraph node function with execution monitoring.
 *
 * @param nodeName - The node name in the graph
 * @param originalFn - The original node function
 * @param monitor - ExecutionMonitor instance for this agent run
 * @returns Wrapped node function with identical signature
 */
export function instrumentNode<TState, TConfig>(
  nodeName: string,
  originalFn: (state: TState, config: TConfig) => Promise<Partial<TState>>,
  monitor: ExecutionMonitor
): (state: TState, config: TConfig) => Promise<Partial<TState>> {
  return async (state: TState, config: TConfig): Promise<Partial<TState>> => {
    const stepType = classifyNode(nodeName);
    const stepId = await monitor.startStep(nodeName, stepType);

    // Inject monitor and step ID into config for sub-step recording by inner code
    const enrichedConfig = injectMonitorIntoConfig(config, monitor, stepId);

    try {
      const result = await originalFn(state, enrichedConfig as TConfig);

      if (stepId) {
        await monitor.completeStep(stepId, 'success');
      }

      return result;
    } catch (error) {
      if (stepId) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        await monitor.failStep(stepId, errorMsg);
      }
      throw error;
    }
  };
}

function injectMonitorIntoConfig<TConfig>(
  config: TConfig,
  monitor: ExecutionMonitor,
  stepId?: string | null
): TConfig {
  try {
    const cfg = config as Record<string, unknown>;
    const configurable = (cfg?.configurable as Record<string, unknown>) ?? {};
    return {
      ...cfg,
      configurable: {
        ...configurable,
        [EXECUTION_MONITOR_CONFIG_KEY]: monitor,
        ...(stepId && { [EXECUTION_STEP_ID_KEY]: stepId }),
      },
    } as TConfig;
  } catch {
    return config;
  }
}

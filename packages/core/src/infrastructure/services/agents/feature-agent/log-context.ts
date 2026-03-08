/**
 * Global log prefix for the feature-agent worker process.
 *
 * Set once at startup with agent type and model info, then read by every
 * logger (worker, node-helpers, executors) so that ALL log lines carry
 * the same [agent|model] prefix for easy filtering.
 */

let _prefix = '';

/**
 * Set the global log prefix. Call once at worker startup.
 * Example: setLogPrefix('claude-code', 'claude-haiku-4-5') → "[claude-code|claude-haiku-4-5] "
 */
export function setLogPrefix(agentType: string, model?: string): void {
  _prefix = model ? `[${agentType}|${model}] ` : `[${agentType}] `;
}

/**
 * Get the current log prefix. Returns empty string if not set.
 */
export function getLogPrefix(): string {
  return _prefix;
}

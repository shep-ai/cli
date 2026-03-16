/**
 * Dev Environment Analyzer Interface
 *
 * Output port for analyzing repository development environments.
 * Supports two modes:
 * - "fast": Deterministic package.json detection (existing detectDevScript logic)
 * - "agent": AI-powered analysis via IStructuredAgentCaller for any language/framework
 *
 * Both modes produce the same DevEnvironmentAnalysis output shape.
 */

import type { DevEnvironmentAnalysis } from '../../../../domain/generated/output.js';

/** Analysis mode: fast (deterministic) or agent (AI-powered). */
export type AnalysisMode = 'fast' | 'agent';

/**
 * Port interface for analyzing repository development environments.
 *
 * Implementations must:
 * - Support two modes of analysis (fast and agent)
 * - Auto-detect the appropriate mode based on repository contents
 * - Return structured DevEnvironmentAnalysis results
 * - Handle repos with no startable server (canStart: false)
 */
export interface IDevEnvironmentAnalyzer {
  /**
   * Analyze a repository and produce a structured DevEnvironmentAnalysis.
   *
   * @param repoPath - Absolute filesystem path to the repository root
   * @param mode - Analysis mode: "fast" for deterministic detection, "agent" for AI analysis
   * @returns Structured analysis result with commands, ports, and language info
   */
  analyze(repoPath: string, mode: AnalysisMode): Promise<DevEnvironmentAnalysis>;

  /**
   * Auto-detect the appropriate analysis mode for a repository.
   *
   * Returns "fast" when a package.json with dev/start/serve scripts is found.
   * Returns "agent" for all other cases (no package.json, no matching scripts,
   * or non-Node.js projects).
   *
   * @param repoPath - Absolute filesystem path to the repository root
   * @returns The recommended analysis mode
   */
  autoDetectMode(repoPath: string): AnalysisMode;
}

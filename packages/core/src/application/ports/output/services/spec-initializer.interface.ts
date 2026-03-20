/**
 * Spec Initializer Service Interface
 *
 * Output port for initializing feature specification directories.
 * Creates the spec YAML files (spec.yaml, research.yaml, plan.yaml,
 * tasks.yaml, feature.yaml) using the same templates as /shep-kit:new-feature.
 */

export interface SpecInitializerResult {
  /** Absolute path to the created spec directory */
  specDir: string;
  /** Zero-padded 3-digit feature number used */
  featureNumber: string;
}

export interface SpecInitializerOptions {
  /**
   * Where to store spec files.
   * - 'in-repo': Store at <worktree>/.shep/specs/NNN-slug/ (committed to git)
   * - 'shep-managed': Store at ~/.shep/repos/<hash>/specs/NNN-slug/ (never committed)
   * @default 'in-repo'
   */
  storageMode?: 'in-repo' | 'shep-managed';
  /**
   * Absolute path to the repository root. Required when storageMode is 'shep-managed'
   * to compute the per-repo hash for the storage path.
   */
  repositoryPath?: string;
}

export interface ISpecInitializerService {
  /**
   * Initialize a spec directory with template YAML files.
   *
   * Creates .shep/specs/NNN-SLUG/ inside the given base directory (in-repo mode)
   * or ~/.shep/repos/<hash>/specs/NNN-SLUG/ (shep-managed mode) with:
   * - spec.yaml
   * - research.yaml
   * - plan.yaml
   * - tasks.yaml
   * - feature.yaml
   *
   * When mode is 'fast', only feature.yaml and spec.yaml are created.
   *
   * @param basePath - Directory to create .shep/specs/ in (typically the worktree path)
   * @param slug - Feature slug (kebab-case, e.g., "user-authentication")
   * @param featureNumber - Sequential feature number (will be zero-padded to 3 digits)
   * @param description - Feature description for template substitution
   * @param mode - Optional mode; when 'fast', only feature.yaml and spec.yaml are created
   * @param options - Optional storage mode configuration
   * @returns The spec directory path and feature number used
   */
  initialize(
    basePath: string,
    slug: string,
    featureNumber: number,
    description: string,
    mode?: 'fast',
    options?: SpecInitializerOptions
  ): Promise<SpecInitializerResult>;
}

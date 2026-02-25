/**
 * @module Shep.Domain.Entities.Settings
 *
 * Defines the global Settings entity for the Shep AI platform. Settings is a
 * singleton entity that stores user preferences, model configuration, and
 * system parameters.
 *
 * ## Singleton Pattern
 *
 * The Settings entity follows a singleton pattern - only one instance exists
 * per Shep installation. This is enforced at the database level with a
 * unique constraint on a sentinel value.
 *
 * ## Settings Structure
 *
 * ```
 * Settings
 * ├── models: ModelConfiguration      (AI model selections for agents)
 * ├── user: UserProfile               (User identity and contact)
 * ├── environment: EnvironmentConfig  (Tooling and shell preferences)
 * ├── system: SystemConfig            (System-level behavior)
 * └── agent: AgentConfig              (AI coding agent selection and auth)
 * ```
 *
 * ## Initialization
 *
 * On first run, Settings is created with sensible defaults:
 * - All agents use claude-sonnet-4-5
 * - Editor defaults to vscode
 * - Shell defaults to bash
 * - Auto-update enabled
 * - Log level set to info
 * - Agent defaults to Claude Code with session auth
 */
import "../../common/base.tsp";
import "../../common/enums/agent-config.tsp";
import "../../common/enums/editor.tsp";
import "../../common/enums/notification.tsp";

/**
 * Model Configuration
 *
 * Specifies which AI models to use for each agent in the Shep SDLC workflow.
 * All models default to claude-sonnet-4-5 for consistent performance.
 *
 * ## Model Selection
 *
 * Users can override these defaults to:
 * - Use faster models for simpler tasks (claude-haiku)
 * - Use more powerful models for complex tasks (claude-opus-4-5)
 * - Balance cost and performance based on project needs
 *
 * ## Supported Models
 *
 * Valid model IDs follow Anthropic's naming convention:
 * - claude-opus-4-5 (most capable)
 * - claude-sonnet-4-5 (balanced, default)
 * - claude-haiku (fastest, most economical)
 */
@doc("AI model configuration for different SDLC agents")
model ModelConfiguration {
  /**
   * Model identifier for the codebase analysis agent.
   * This agent performs static analysis, dependency mapping,
   * and architecture discovery.
   */
  @doc("Model for codebase analysis agent")
  analyze: string = "claude-sonnet-4-5";

  /**
   * Model identifier for the requirements gathering agent.
   * This agent conducts conversational requirements elicitation
   * and clarification with the user.
   */
  @doc("Model for requirements gathering agent")
  requirements: string = "claude-sonnet-4-5";

  /**
   * Model identifier for the planning agent.
   * This agent breaks down features into tasks, creates work plans,
   * and generates implementation strategies.
   */
  @doc("Model for planning agent")
  plan: string = "claude-sonnet-4-5";

  /**
   * Model identifier for the implementation agent.
   * This agent executes code changes, writes tests,
   * and performs refactoring.
   */
  @doc("Model for implementation agent")
  implement: string = "claude-sonnet-4-5";
}

/**
 * User Profile
 *
 * Stores optional user identity information. This data is used for:
 * - Personalizing CLI messages
 * - Attributing commits and PRs
 * - Providing contact info in generated documentation
 *
 * ## Privacy
 *
 * All fields are optional. Users can choose to remain anonymous
 * or provide as much or as little information as they prefer.
 */
@doc("User profile information")
model UserProfile {
  /**
   * User's display name.
   * Used in generated commit messages and documentation.
   */
  @doc("User's display name (optional)")
  name?: string;

  /**
   * User's email address.
   * Used for commit attribution and generated documentation.
   */
  @doc("User's email address (optional)")
  email?: string;

  /**
   * GitHub username.
   * Used for PR attribution, @mentions in generated code comments,
   * and linking to GitHub profiles in documentation.
   */
  @doc("GitHub username (optional, for PR attribution)")
  githubUsername?: string;
}

/**
 * Environment Configuration
 *
 * Specifies user preferences for development tooling and shell environment.
 * These settings affect how Shep opens files and runs commands.
 *
 * ## Editor Integration
 *
 * The defaultEditor setting controls which editor opens when Shep
 * needs to show code or allow manual edits.
 *
 * ## Shell Preference
 *
 * The shellPreference setting affects:
 * - Which shell syntax is used in generated scripts
 * - How environment variables are handled
 * - Which shell profile files are sourced
 */
@doc("Environment and tooling preferences")
model EnvironmentConfig {
  /**
   * Preferred code editor.
   * Must be one of the supported EditorType values.
   */
  @doc("Preferred code editor")
  defaultEditor: EditorType = EditorType.VsCode;

  /**
   * Preferred shell.
   * Common values: bash, zsh, fish
   */
  @doc("Preferred shell")
  shellPreference: string = "bash";
}

/**
 * System Configuration
 *
 * Controls system-level behavior of the Shep CLI.
 *
 * ## Auto-Update
 *
 * When enabled, Shep checks for updates on startup and prompts
 * the user to upgrade when a new version is available.
 *
 * ## Log Level
 *
 * Controls verbosity of CLI output:
 * - debug: Everything (verbose debugging)
 * - info: Normal informational messages (default)
 * - warn: Warnings and errors only
 * - error: Errors only
 */
@doc("System configuration")
model SystemConfig {
  /**
   * Whether to check for and prompt for CLI updates.
   * When false, users must manually upgrade.
   */
  @doc("CLI auto-update preference")
  autoUpdate: boolean = true;

  /**
   * Log level for CLI output.
   * Valid values: debug, info, warn, error
   */
  @doc("Log level for CLI output")
  logLevel: string = "info";
}

/**
 * Agent Configuration
 *
 * Specifies which AI coding agent tool Shep uses for all LLM-powered
 * operations and how authentication is handled for that agent.
 *
 * ## Agent Selection
 *
 * Users select their preferred agent via `shep settings agent`. Currently
 * only Claude Code is fully supported; other agents appear as "Coming Soon".
 *
 * ## Authentication
 *
 * Each agent supports different auth methods:
 * - session: Use the agent's existing auth (e.g., Claude Code OAuth)
 * - token: Provide an API token stored in the Shep settings database
 */
/**
 * Workflow Configuration
 *
 * Global defaults for the post-implementation workflow.
 * These settings are DEFAULTS that can be overridden per-feature
 * using CLI flags (--pr, --allow-merge, etc.).
 *
 * Resolution order: CLI flag → Feature entity in DB → Settings default.
 */
@doc("Default approval gate settings for new features")
model ApprovalGateDefaults {
  @doc("Auto-approve requirements phase (default: false)")
  allowPrd: boolean = false;

  @doc("Auto-approve planning phase (default: false)")
  allowPlan: boolean = false;

  @doc("Auto-approve merge phase (default: false)")
  allowMerge: boolean = false;

  @doc("Push branch to remote on implementation complete (default: false)")
  pushOnImplementationComplete: boolean = false;
}

@doc("Global workflow configuration defaults")
model WorkflowConfig {
  /**
   * Whether to automatically create a PR when implementation completes.
   * Per-feature override: `feat new --pr`
   */
  @doc("Create PR on implementation complete (default: false)")
  openPrOnImplementationComplete: boolean = false;

  /**
   * Default approval gate preferences for new features.
   * Per-feature overrides: `feat new --allow-prd`, `--allow-plan`, etc.
   */
  @doc("Default approval gate preferences for new features")
  approvalGateDefaults: ApprovalGateDefaults;

  @doc("Maximum number of CI fix/push/watch iterations before giving up (default: 3)")
  ciMaxFixAttempts?: int32;

  @doc("Timeout in milliseconds for watching a CI run (default: 600000 = 10 minutes)")
  ciWatchTimeoutMs?: int32;

  @doc("Maximum characters of CI failure logs to pass to the executor (default: 50000)")
  ciLogMaxChars?: int32;
}

@doc("AI coding agent configuration")
model AgentConfig {
  /**
   * The AI coding agent tool to use.
   * Defaults to Claude Code as the only currently supported agent.
   */
  @doc("Selected AI coding agent")
  type: AgentType = AgentType.ClaudeCode;

  /**
   * Authentication method for the selected agent.
   * Session auth uses the agent's built-in auth; token auth uses
   * a stored API key.
   */
  @doc("Authentication method for the agent")
  authMethod: AgentAuthMethod = AgentAuthMethod.Session;

  /**
   * API token for token-based authentication.
   * Only used when authMethod is "token". Set via the TUI wizard
   * or --token CLI flag. Stored in the settings database.
   */
  @doc("API token for token-based auth (optional)")
  token?: string;
}

/**
 * Notification Channel Configuration
 *
 * Controls whether a specific notification channel is enabled.
 * Each channel (in-app, browser, desktop) has an independent enable flag.
 * All channels default to disabled (opt-in) to respect user attention.
 */
@doc("Notification channel enable/disable configuration")
model NotificationChannelConfig {
  /**
   * Whether this notification channel is active.
   * Defaults to true (opt-out). Users can explicitly disable each channel.
   */
  @doc("Whether this notification channel is enabled")
  enabled: boolean = true;
}

/**
 * Notification Event Type Filters
 *
 * Controls which agent lifecycle events trigger notifications.
 * All event types default to enabled so that when a user turns on a
 * channel, they receive all relevant notifications immediately.
 * Users can then selectively disable event types they find noisy.
 */
@doc("Notification event type filters")
model NotificationEventConfig {
  @doc("Notify when agent starts running")
  agentStarted: boolean = true;

  @doc("Notify when agent completes a workflow phase")
  phaseCompleted: boolean = true;

  @doc("Notify when agent is waiting for human approval")
  waitingApproval: boolean = true;

  @doc("Notify when agent completes successfully")
  agentCompleted: boolean = true;

  @doc("Notify when agent execution fails")
  agentFailed: boolean = true;

  @doc("Notify when a pull request is merged on GitHub")
  prMerged: boolean = true;

  @doc("Notify when a pull request is closed without merging on GitHub")
  prClosed: boolean = true;

  @doc("Notify when pull request CI checks pass")
  prChecksPassed: boolean = true;

  @doc("Notify when pull request CI checks fail")
  prChecksFailed: boolean = true;
}

/**
 * Notification Preferences
 *
 * Top-level notification configuration nested in Settings.
 * Contains per-channel enable/disable and event type filters.
 *
 * ## Channel Independence
 *
 * Each channel can be enabled/disabled independently:
 * - inApp: Sonner toast notifications in the web UI
 * - browser: Web Notifications API (works when tab is in background)
 * - desktop: Native OS notifications via node-notifier (no browser needed)
 *
 * ## Event Filtering
 *
 * The events config controls which lifecycle transitions trigger
 * notifications across all enabled channels.
 */
@doc("Notification preferences for agent lifecycle events")
model NotificationPreferences {
  @doc("In-app toast notification channel (Sonner)")
  inApp: NotificationChannelConfig;

  @doc("Browser push notification channel (Web Notifications API)")
  browser: NotificationChannelConfig;

  @doc("Desktop OS notification channel (node-notifier)")
  desktop: NotificationChannelConfig;

  @doc("Which event types trigger notifications")
  events: NotificationEventConfig;
}

/**
 * Experimental Feature Flags
 *
 * Controls which experimental features are enabled. All flags default to off.
 * Adding a new experimental feature requires adding a boolean field here,
 * a migration column (exp_ prefix), a mapper line, and a registry entry.
 */
@doc("Experimental feature flags (all default to off)")
model ExperimentalFeatures {
  @doc("Enable the experimental skills management page")
  skills: boolean = false;
}

/**
 * Settings Entity
 *
 * Global Shep platform settings stored as a singleton. This entity contains
 * all user preferences, model configurations, and system parameters.
 *
 * ## Properties
 *
 * | Property    | Type                | Required | Description                          |
 * |-------------|---------------------|----------|--------------------------------------|
 * | id          | UUID                | Yes      | Unique identifier (from BaseEntity)  |
 * | models      | ModelConfiguration  | Yes      | AI model configuration for agents    |
 * | user        | UserProfile         | Yes      | User profile information             |
 * | environment | EnvironmentConfig   | Yes      | Environment and tooling preferences  |
 * | system      | SystemConfig        | Yes      | System-level parameters              |
 * | agent       | AgentConfig              | Yes      | AI coding agent selection and auth   |
 * | notifications | NotificationPreferences | Yes   | Notification preferences             |
 * | createdAt   | utcDateTime              | Yes      | When created (from BaseEntity)       |
 * | updatedAt   | utcDateTime              | Yes      | When last updated (from BaseEntity)  |
 *
 * ## Example
 *
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "models": {
 *     "analyze": "claude-sonnet-4-5",
 *     "requirements": "claude-sonnet-4-5",
 *     "plan": "claude-sonnet-4-5",
 *     "implement": "claude-opus-4-5"
 *   },
 *   "user": {
 *     "name": "Jane Doe",
 *     "email": "jane@example.com",
 *     "githubUsername": "janedoe"
 *   },
 *   "environment": {
 *     "defaultEditor": "vscode",
 *     "shellPreference": "bash"
 *   },
 *   "system": {
 *     "autoUpdate": true,
 *     "logLevel": "info"
 *   },
 *   "agent": {
 *     "type": "claude-code",
 *     "authMethod": "session"
 *   },
 *   "createdAt": "2026-02-03T10:00:00Z",
 *   "updatedAt": "2026-02-03T10:00:00Z"
 * }
 * ```
 *
 * ## Singleton Enforcement
 *
 * The database layer enforces singleton behavior:
 * - Table has a UNIQUE constraint on a sentinel column
 * - Only one row can ever exist
 * - Updates modify the single row
 * - Initialization creates the row if it doesn't exist
 */
@doc("Global Shep platform settings (singleton)")
model Settings extends BaseEntity {
  /**
   * AI model configuration for different SDLC agents.
   * Specifies which models to use for analysis, requirements,
   * planning, and implementation.
   */
  @doc("AI model configuration for different agents")
  models: ModelConfiguration;

  /**
   * User profile information.
   * All fields are optional and used for personalization,
   * commit attribution, and documentation generation.
   */
  @doc("User profile information")
  user: UserProfile;

  /**
   * Environment and tooling preferences.
   * Controls which editor and shell Shep uses.
   */
  @doc("Environment and tooling preferences")
  environment: EnvironmentConfig;

  /**
   * System-level configuration parameters.
   * Controls auto-update behavior and logging verbosity.
   */
  @doc("System-level parameters")
  system: SystemConfig;

  /**
   * AI coding agent configuration.
   * Controls which agent tool Shep uses and how it authenticates.
   */
  @doc("AI coding agent selection and authentication")
  agent: AgentConfig;

  /**
   * Notification preferences for agent lifecycle events.
   * Controls which channels (in-app, browser, desktop) are enabled
   * and which event types trigger notifications.
   * All channels default to disabled (opt-in).
   */
  @doc("Notification preferences for agent lifecycle events")
  notifications: NotificationPreferences;

  /**
   * Workflow configuration defaults.
   * Controls global PR creation and auto-merge behavior.
   * Per-feature flags override these defaults.
   */
  @doc("Global workflow configuration defaults")
  workflow: WorkflowConfig;

  /**
   * Experimental feature flags.
   * Controls which experimental features are enabled for this user.
   * All flags default to off (disabled).
   */
  @doc("Experimental feature flags")
  experimental: ExperimentalFeatures;

  /**
   * Whether the first-run onboarding wizard has been completed.
   * When false, CLI bootstrap gates all commands until the wizard runs.
   */
  @doc("Whether first-run onboarding has been completed (default: false)")
  onboardingComplete: boolean = false;
}

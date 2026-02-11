/**
 * Feature Schema
 * Complete data model for a Feature including all fields visible across all tabs
 */

/**
 * @typedef {Object} User
 * @property {string} id - User unique identifier
 * @property {string} name - User display name
 * @property {string} initials - User initials for avatar
 * @property {string} avatarColor - Gradient color class for avatar
 */

/**
 * @typedef {Object} Tag
 * @property {string} id - Tag unique identifier
 * @property {string} label - Tag display text
 * @property {string} color - Tag color class (e.g., 'blue', 'emerald')
 */

/**
 * @typedef {Object} Attachment
 * @property {string} id - Attachment unique identifier
 * @property {string} name - File name
 * @property {string} size - File size (e.g., '1.2 MB')
 * @property {string} type - File type (e.g., 'pdf', 'image', 'document')
 * @property {string} icon - FontAwesome icon class
 * @property {string} url - Download URL
 * @property {string} uploadedBy - User ID who uploaded
 * @property {string} uploadedAt - Upload timestamp
 */

/**
 * @typedef {Object} Dependency
 * @property {string} id - Dependency unique identifier
 * @property {string} featureId - Related feature ID
 * @property {string} featureTitle - Related feature title
 * @property {string} type - Dependency type ('blocks', 'blocked_by', 'related')
 * @property {string} status - Status of the dependency
 */

/**
 * @typedef {Object} AcceptanceCriteria
 * @property {string} id - Criteria unique identifier
 * @property {string} description - Criteria description
 * @property {boolean} completed - Whether criteria is met
 */

/**
 * @typedef {Object} Task
 * @property {string} id - Task unique identifier
 * @property {string} title - Task title
 * @property {string} description - Task description
 * @property {'todo'|'progress'|'done'|'blocked'} status - Task status
 * @property {string} [assignee] - Assigned user ID (optional)
 * @property {AcceptanceCriteria[]} acceptanceCriteria - List of acceptance criteria
 * @property {string} [time] - Time indication (e.g., '2 days ago')
 * @property {number} order - Display order
 * @property {string} createdAt - Creation timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} ActionItem
 * @property {string} id - Action item unique identifier
 * @property {string} description - Action item description (e.g., "Install npm dependencies")
 * @property {boolean} completed - Whether action item is complete
 * @property {number} order - Display order
 */

/**
 * @typedef {Object} Commit
 * @property {string} sha - Commit SHA (short form, e.g., 'a3f7d9e')
 * @property {string} message - Commit message
 * @property {string} author - Commit author name
 * @property {string} timestamp - Human-readable time (e.g., '2h ago')
 * @property {number} filesChanged - Number of files changed
 * @property {number} additions - Lines added
 * @property {number} deletions - Lines deleted
 * @property {'RED'|'GREEN'|'REFACTOR'|null} tddPhase - TDD phase of commit
 */

/**
 * @typedef {Object} ChangesSummary
 * @property {number} filesChanged - Total files changed
 * @property {number} additions - Total lines added
 * @property {number} deletions - Total lines deleted
 * @property {number} commits - Total number of commits
 */

/**
 * @typedef {Object} Phase
 * @property {string} id - Phase unique identifier
 * @property {string} name - Phase name (e.g., "Phase 0: Foundation")
 * @property {string} description - Phase description
 * @property {'pending'|'running'|'completed'|'merged'} status - Phase status
 * @property {number} order - Sequential ordering (determines dependencies)
 * @property {number|null} parallelGroup - Phases with same group run in parallel
 * @property {string} branch - Git branch name (e.g., "feat/cli/phase-0")
 * @property {string} worktree - Worktree path (e.g., ".worktrees/phase-0-foundation")
 * @property {string} estimatedTime - Estimated completion time
 * @property {number} progress - Progress percentage (0-100)
 * @property {string|null} currentActionItem - ID of current action item
 * @property {'RED'|'GREEN'|'REFACTOR'|null} tddCycle - Current TDD cycle phase
 * @property {ActionItem[]} actionItems - List of action items
 * @property {Commit[]} commits - List of commits in phase
 * @property {ChangesSummary} changesSummary - Summary of changes
 * @property {string|null} mergedAt - Timestamp when merged
 * @property {string} mergedInto - Branch merged into
 * @property {string} createdAt - Creation timestamp
 * @property {string|null} completedAt - Completion timestamp
 * @property {string} updatedAt - Last update timestamp
 */

/**
 * @typedef {Object} ActivityEvent
 * @property {string} id - Event unique identifier
 * @property {string} userId - User who performed the action
 * @property {string} userName - User display name
 * @property {string} userInitials - User initials
 * @property {string} userAvatarColor - Avatar color class
 * @property {'phase_change'|'task_complete'|'attachment_add'|'description_update'|'tag_add'|'created'} type - Event type
 * @property {string} message - Human-readable event description
 * @property {Object} [metadata] - Additional event data
 * @property {string} timestamp - Event timestamp
 * @property {string} timeAgo - Human-readable time (e.g., '2 hours ago')
 */

/**
 * @typedef {Object} Settings
 * @property {boolean} notifications - Enable/disable notifications
 * @property {boolean} autoAssignTasks - Enable/disable auto-assignment
 * @property {'public'|'team'|'private'} visibility - Feature visibility level
 * @property {boolean} archived - Whether feature is archived
 */

/**
 * @typedef {Object} Progress
 * @property {number} percentage - Overall completion percentage (0-100)
 * @property {number} doneCount - Number of completed tasks
 * @property {number} progressCount - Number of in-progress tasks
 * @property {number} todoCount - Number of todo tasks
 * @property {number} blockedCount - Number of blocked tasks
 * @property {number} totalCount - Total number of tasks
 */

/**
 * Complete Feature Model
 * @typedef {Object} Feature
 *
 * // Core Identity
 * @property {string} id - Unique identifier
 * @property {string} title - Feature name/title
 * @property {string} description - Detailed description
 * @property {string} slug - URL-friendly identifier
 *
 * // Lifecycle & Status
 * @property {number} phaseId - Current lifecycle phase (0-8)
 * @property {'low'|'medium'|'high'|'critical'} priority - Priority level
 * @property {string} status - Current status description
 *
 * // Hierarchy
 * @property {string|null} parentId - Parent feature ID (null for root)
 * @property {Feature[]} children - Child features
 *
 * // Team & Ownership
 * @property {User} owner - Feature owner
 * @property {User[]} collaborators - List of collaborators
 *
 * // Classification
 * @property {Tag[]} tags - Feature tags
 *
 * // Relationships
 * @property {Dependency[]} dependencies - Feature dependencies
 * @property {Attachment[]} attachments - File attachments
 *
 * // Tasks & Progress (for non-Implementation phases)
 * @property {Task[]} tasks - Task breakdown
 * @property {Progress} progress - Calculated progress metrics
 *
 * // Phases (only during Implementation phase 5)
 * @property {Phase[]} phases - Implementation phases (RED-GREEN-REFACTOR cycles)
 * @property {string} featureBranch - Feature branch name (e.g., "feat/006-cli-settings-commands")
 * @property {string|null} implementationStartedAt - When Implementation phase started
 *
 * // Activity & History
 * @property {ActivityEvent[]} activity - Activity timeline
 *
 * // Settings
 * @property {Settings} settings - Feature-specific settings
 *
 * // Timestamps
 * @property {string} createdAt - Creation date
 * @property {string} updatedAt - Last update date
 * @property {string} [archivedAt] - Archive date (if archived)
 *
 * // Metadata
 * @property {Object} metadata - Additional metadata
 * @property {string} metadata.repository - Repository path
 * @property {string} metadata.branch - Git branch
 * @property {string[]} metadata.labels - Additional labels
 * @property {Object} metadata.customFields - Custom field values
 */

/**
 * Default Feature Factory
 * Creates a new feature with all required fields and sensible defaults
 *
 * @param {string} title - Feature title
 * @param {Object} options - Optional overrides
 * @returns {Feature} Complete feature object
 */
export function createFeature(title, options = {}) {
  const now = new Date().toISOString();
  const id = options.id || `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    // Core Identity
    id,
    title,
    description: options.description || '',
    slug: options.slug || title.toLowerCase().replace(/\s+/g, '-'),

    // Lifecycle & Status
    phaseId: options.phaseId || 0,
    priority: options.priority || 'medium',
    status: options.status || 'active',

    // Hierarchy
    parentId: options.parentId || null,
    children: options.children || [],

    // Team & Ownership
    owner: options.owner || {
      id: 'user_1',
      name: 'User',
      initials: 'U',
      avatarColor: 'from-indigo-500 to-purple-600',
    },
    collaborators: options.collaborators || [],

    // Classification
    tags: options.tags || [],

    // Relationships
    dependencies: options.dependencies || [],
    attachments: options.attachments || [],

    // Tasks & Progress (for non-Implementation phases)
    tasks: options.tasks || [],
    progress: options.progress || {
      percentage: 0,
      doneCount: 0,
      progressCount: 0,
      todoCount: 0,
      blockedCount: 0,
      totalCount: 0,
    },

    // Phases (only during Implementation phase 5)
    phases: options.phases || [],
    featureBranch: options.featureBranch || `feat/${title.toLowerCase().replace(/\s+/g, '-')}`,
    implementationStartedAt: options.implementationStartedAt || null,

    // Activity & History
    activity: options.activity || [
      {
        id: `activity_${Date.now()}`,
        userId: options.owner?.id || 'user_1',
        userName: options.owner?.name || 'User',
        userInitials: options.owner?.initials || 'U',
        userAvatarColor: options.owner?.avatarColor || 'from-indigo-500 to-purple-600',
        type: 'created',
        message: 'Created feature',
        metadata: {},
        timestamp: now,
        timeAgo: 'just now',
      },
    ],

    // Settings
    settings: options.settings || {
      notifications: true,
      autoAssignTasks: false,
      visibility: 'team',
      archived: false,
    },

    // Timestamps
    createdAt: options.createdAt || now,
    updatedAt: options.updatedAt || now,
    archivedAt: options.archivedAt || null,

    // Metadata
    metadata: options.metadata || {
      repository: '',
      branch: '',
      labels: [],
      customFields: {},
    },
  };
}

/**
 * Feature Validator
 * Validates a feature object against the schema
 *
 * @param {Feature} feature - Feature to validate
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateFeature(feature) {
  const errors = [];

  // Required fields
  if (!feature.id) errors.push('Missing required field: id');
  if (!feature.title || feature.title.trim() === '')
    errors.push('Missing or empty required field: title');
  if (typeof feature.phaseId !== 'number') errors.push('Invalid field: phaseId must be a number');

  // Valid phase range
  if (feature.phaseId < 0 || feature.phaseId > 8) {
    errors.push('Invalid phaseId: must be between 0 and 8');
  }

  // Valid priority
  const validPriorities = ['low', 'medium', 'high', 'critical'];
  if (!validPriorities.includes(feature.priority)) {
    errors.push(`Invalid priority: must be one of ${validPriorities.join(', ')}`);
  }

  // Valid visibility
  const validVisibilities = ['public', 'team', 'private'];
  if (feature.settings && !validVisibilities.includes(feature.settings.visibility)) {
    errors.push(`Invalid visibility: must be one of ${validVisibilities.join(', ')}`);
  }

  // Arrays must be arrays
  if (feature.children && !Array.isArray(feature.children)) {
    errors.push('Invalid field: children must be an array');
  }
  if (feature.tags && !Array.isArray(feature.tags)) {
    errors.push('Invalid field: tags must be an array');
  }
  if (feature.tasks && !Array.isArray(feature.tasks)) {
    errors.push('Invalid field: tasks must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate feature progress from tasks
 * @param {Task[]} tasks - List of tasks
 * @returns {Progress} Progress metrics
 */
export function calculateProgress(tasks) {
  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progressCount = tasks.filter((t) => t.status === 'progress').length;
  const todoCount = tasks.filter((t) => t.status === 'todo').length;
  const blockedCount = tasks.filter((t) => t.status === 'blocked').length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return {
    percentage,
    doneCount,
    progressCount,
    todoCount,
    blockedCount,
    totalCount,
  };
}

/**
 * Create an action item
 * @param {string} description - Action item description
 * @param {Object} options - Optional overrides
 * @returns {ActionItem} Action item object
 */
export function createActionItem(description, options = {}) {
  return {
    id: options.id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    description,
    completed: options.completed || false,
    order: options.order || 0,
  };
}

/**
 * Create a commit
 * @param {string} message - Commit message
 * @param {Object} options - Optional overrides
 * @returns {Commit} Commit object
 */
export function createCommit(message, options = {}) {
  return {
    sha: options.sha || Math.random().toString(16).substr(2, 7),
    message,
    author: options.author || 'Claude Haiku',
    timestamp: options.timestamp || 'just now',
    filesChanged: options.filesChanged || 0,
    additions: options.additions || 0,
    deletions: options.deletions || 0,
    tddPhase: options.tddPhase || null,
  };
}

/**
 * Create a phase
 * @param {string} name - Phase name
 * @param {Object} options - Optional overrides
 * @returns {Phase} Phase object
 */
export function createPhase(name, options = {}) {
  const now = new Date().toISOString();
  const phaseId = options.id || `phase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id: phaseId,
    name,
    description: options.description || '',
    status: options.status || 'pending',
    order: options.order || 0,
    parallelGroup: options.parallelGroup !== undefined ? options.parallelGroup : null,
    branch: options.branch || `phase-${options.order || 0}`,
    worktree: options.worktree || `.worktrees/phase-${options.order || 0}`,
    estimatedTime: options.estimatedTime || '',
    progress: options.progress || 0,
    currentActionItem: options.currentActionItem || null,
    tddCycle: options.tddCycle || null,
    actionItems: options.actionItems || [],
    commits: options.commits || [],
    changesSummary: options.changesSummary || {
      filesChanged: 0,
      additions: 0,
      deletions: 0,
      commits: 0,
    },
    mergedAt: options.mergedAt || null,
    mergedInto: options.mergedInto || '',
    createdAt: options.createdAt || now,
    completedAt: options.completedAt || null,
    updatedAt: options.updatedAt || now,
  };
}

/**
 * Export schema types for documentation
 */
export const SCHEMA_VERSION = '1.0.0';

export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const VALID_VISIBILITIES = ['public', 'team', 'private'];
export const VALID_TASK_STATUSES = ['todo', 'progress', 'done', 'blocked'];
export const VALID_DEPENDENCY_TYPES = ['blocks', 'blocked_by', 'related'];
export const VALID_ACTIVITY_TYPES = [
  'created',
  'phase_change',
  'task_complete',
  'attachment_add',
  'description_update',
  'tag_add',
  'archived',
  'restored',
];

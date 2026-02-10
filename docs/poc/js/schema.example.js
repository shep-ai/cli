/**
 * Example Usage of Feature Schema
 * Demonstrates how to create and use feature objects
 */

import { createFeature, validateFeature, calculateProgress } from './schema.js';

// Example 1: Create a minimal feature
const minimalFeature = createFeature('User Authentication');
console.log('Minimal Feature:', minimalFeature);

// Example 2: Create a feature with custom data
const fullFeature = createFeature('API Rate Limiting', {
  description: 'Implement sliding window rate limiting for public endpoints using Redis.',
  phaseId: 5,
  priority: 'high',
  tags: [
    { id: 'tag_1', label: 'Backend', color: 'blue' },
    { id: 'tag_2', label: 'Performance', color: 'amber' },
  ],
  collaborators: [
    { id: 'user_2', name: 'Alice', initials: 'A', avatarColor: 'from-emerald-500 to-teal-600' },
    { id: 'user_3', name: 'Bob', initials: 'B', avatarColor: 'from-amber-500 to-orange-600' },
  ],
  tasks: [
    {
      id: 'task_1',
      title: 'Setup Redis connection',
      description: 'Configure Redis client and connection pool',
      status: 'done',
      assignee: 'user_2',
      acceptanceCriteria: [
        { id: 'ac_1', description: 'Connection pool configured', completed: true },
        { id: 'ac_2', description: 'Error handling implemented', completed: true },
      ],
      time: '2 days ago',
      order: 0,
      createdAt: '2024-02-07T10:00:00Z',
      updatedAt: '2024-02-07T14:30:00Z',
    },
    {
      id: 'task_2',
      title: 'Implement rate limiter middleware',
      description: 'Create Express middleware for rate limiting',
      status: 'progress',
      assignee: 'user_3',
      acceptanceCriteria: [
        { id: 'ac_3', description: 'Sliding window algorithm implemented', completed: true },
        { id: 'ac_4', description: 'Unit tests written', completed: false },
      ],
      order: 1,
      createdAt: '2024-02-08T09:00:00Z',
      updatedAt: '2024-02-09T11:00:00Z',
    },
    {
      id: 'task_3',
      title: 'Add monitoring and alerts',
      description: 'Track rate limit hits and setup alerts',
      status: 'todo',
      acceptanceCriteria: [
        { id: 'ac_5', description: 'Metrics collection configured', completed: false },
        { id: 'ac_6', description: 'Alert rules defined', completed: false },
      ],
      order: 2,
      createdAt: '2024-02-08T10:00:00Z',
      updatedAt: '2024-02-08T10:00:00Z',
    },
  ],
  attachments: [
    {
      id: 'att_1',
      name: 'rate-limiting-spec.pdf',
      size: '1.2 MB',
      type: 'pdf',
      icon: 'fa-file-pdf',
      url: '/attachments/rate-limiting-spec.pdf',
      uploadedBy: 'user_1',
      uploadedAt: '2024-02-06T15:00:00Z',
    },
    {
      id: 'att_2',
      name: 'architecture-diagram.png',
      size: '845 KB',
      type: 'image',
      icon: 'fa-file-image',
      url: '/attachments/architecture-diagram.png',
      uploadedBy: 'user_2',
      uploadedAt: '2024-02-07T09:00:00Z',
    },
  ],
  dependencies: [
    {
      id: 'dep_1',
      featureId: 'feature_123',
      featureTitle: 'Redis Infrastructure Setup',
      type: 'blocked_by',
      status: 'done',
    },
  ],
  settings: {
    notifications: true,
    autoAssignTasks: true,
    visibility: 'team',
    archived: false,
  },
  metadata: {
    repository: '/home/user/projects/api-server',
    branch: 'feature/rate-limiting',
    labels: ['api', 'redis', 'performance'],
    customFields: {
      estimatedHours: 40,
      actualHours: 28,
      reviewers: ['user_4', 'user_5'],
    },
  },
});

// Calculate progress automatically
fullFeature.progress = calculateProgress(fullFeature.tasks);
console.log('Full Feature with Progress:', fullFeature);
console.log('Progress:', fullFeature.progress);
// Output: { percentage: 33, doneCount: 1, progressCount: 1, todoCount: 1, blockedCount: 0, totalCount: 3 }

// Example 3: Validate feature data
const validationResult = validateFeature(fullFeature);
console.log('Validation:', validationResult);
// Output: { valid: true, errors: [] }

// Example 4: Invalid feature (for validation demo)
const invalidFeature = {
  id: 'feature_invalid',
  title: '', // Empty title
  phaseId: 99, // Invalid phase
  priority: 'super-urgent', // Invalid priority
  children: 'not-an-array', // Should be array
  settings: {
    visibility: 'secret', // Invalid visibility
  },
};

const invalidResult = validateFeature(invalidFeature);
console.log('Invalid Feature Validation:', invalidResult);
// Output: { valid: false, errors: [...] }

// Example 5: Working with child features (hierarchy)
const parentFeature = createFeature('E-commerce Platform', {
  phaseId: 2,
  priority: 'critical',
});

const childFeature1 = createFeature('Shopping Cart', {
  parentId: parentFeature.id,
  phaseId: 5,
  priority: 'high',
});

const childFeature2 = createFeature('Payment Gateway', {
  parentId: parentFeature.id,
  phaseId: 3,
  priority: 'critical',
});

parentFeature.children = [childFeature1, childFeature2];

console.log('Feature Hierarchy:', {
  parent: parentFeature.title,
  children: parentFeature.children.map((c) => c.title),
});

// Example 6: Adding activity events
function addActivityEvent(feature, type, message, userId = 'user_1') {
  const event = {
    id: `activity_${Date.now()}`,
    userId,
    userName: feature.owner.name,
    userInitials: feature.owner.initials,
    userAvatarColor: feature.owner.avatarColor,
    type,
    message,
    metadata: {},
    timestamp: new Date().toISOString(),
    timeAgo: 'just now',
  };

  feature.activity.unshift(event); // Add to beginning
  feature.updatedAt = event.timestamp;

  return feature;
}

addActivityEvent(fullFeature, 'phase_change', 'Moved phase from Planning to Implementation');
addActivityEvent(fullFeature, 'task_complete', 'Completed task: Setup Redis connection', 'user_2');
console.log('Feature with Activity:', fullFeature.activity);

export { minimalFeature, fullFeature, parentFeature, addActivityEvent };

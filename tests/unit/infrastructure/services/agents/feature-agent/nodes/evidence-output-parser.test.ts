import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the fs mock so vi.mock can reference it
const { mockStat } = vi.hoisted(() => ({
  mockStat: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  stat: (...args: unknown[]) => mockStat(...args),
}));

import {
  parseEvidenceRecords,
  validateUiEvidenceHasAppProof,
  inferTaskTypes,
  validateEvidenceCompleteness,
  validateFileExistence,
  validateEvidence,
  type TaskForValidation,
} from '../../../../../../../packages/core/src/infrastructure/services/agents/feature-agent/nodes/evidence-output-parser.js';
import {
  EvidenceType,
  type Evidence,
} from '../../../../../../../packages/core/src/domain/generated/output.js';

describe('evidence-output-parser', () => {
  describe('parseEvidenceRecords', () => {
    it('should extract valid Evidence[] from agent output with JSON block', () => {
      const output = `I captured the following evidence:

\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Homepage after login",
    "relativePath": ".shep/evidence/homepage.png",
    "taskRef": "task-1"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-03-09T12:01:00Z",
    "description": "Unit test results",
    "relativePath": ".shep/evidence/test-output.txt"
  }
]
\`\`\`

Evidence collection complete.`;

      const result = parseEvidenceRecords(output);
      expect(result).toEqual([
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Homepage after login',
          relativePath: '.shep/evidence/homepage.png',
          taskRef: 'task-1',
        },
        {
          type: EvidenceType.TestOutput,
          capturedAt: '2026-03-09T12:01:00Z',
          description: 'Unit test results',
          relativePath: '.shep/evidence/test-output.txt',
        },
      ]);
    });

    it('should return empty array when no JSON block found', () => {
      const output = 'I tried to capture evidence but no screenshots were taken.';
      expect(parseEvidenceRecords(output)).toEqual([]);
    });

    it('should return empty array on malformed JSON', () => {
      const output = `Here is the evidence:

\`\`\`json
[{ broken json {{{}
\`\`\``;

      expect(parseEvidenceRecords(output)).toEqual([]);
    });

    it('should filter records missing required fields', () => {
      const output = `\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Valid screenshot",
    "relativePath": ".shep/evidence/valid.png"
  },
  {
    "type": "Screenshot",
    "description": "Missing capturedAt",
    "relativePath": ".shep/evidence/missing.png"
  },
  {
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Missing type",
    "relativePath": ".shep/evidence/no-type.png"
  },
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "relativePath": ".shep/evidence/no-desc.png"
  },
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Missing path"
  }
]
\`\`\``;

      const result = parseEvidenceRecords(output);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Valid screenshot');
    });

    it('should filter records with path traversal in relativePath', () => {
      const output = `\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Safe path",
    "relativePath": ".shep/evidence/safe.png"
  },
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Path traversal",
    "relativePath": "../../../etc/passwd"
  },
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Sneaky traversal",
    "relativePath": ".shep/evidence/../../secret.txt"
  }
]
\`\`\``;

      const result = parseEvidenceRecords(output);
      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Safe path');
    });

    it('should handle mixed valid and invalid records', () => {
      const output = `\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Valid one",
    "relativePath": ".shep/evidence/one.png"
  },
  "not an object",
  null,
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:02:00Z",
    "description": "Valid two",
    "relativePath": ".shep/evidence/two.png",
    "taskRef": "task-3"
  },
  42,
  {
    "type": "InvalidType",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Bad type",
    "relativePath": ".shep/evidence/bad-type.png"
  }
]
\`\`\``;

      const result = parseEvidenceRecords(output);
      expect(result).toHaveLength(2);
      expect(result[0].description).toBe('Valid one');
      expect(result[1].description).toBe('Valid two');
      expect(result[1].taskRef).toBe('task-3');
    });

    it('should handle empty JSON array', () => {
      const output = `No evidence found.

\`\`\`json
[]
\`\`\``;

      expect(parseEvidenceRecords(output)).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(parseEvidenceRecords('')).toEqual([]);
    });

    it('should return empty array when JSON is not an array', () => {
      const output = `\`\`\`json
{
  "type": "Screenshot",
  "capturedAt": "2026-03-09T12:00:00Z",
  "description": "Single object, not array",
  "relativePath": ".shep/evidence/single.png"
}
\`\`\``;

      expect(parseEvidenceRecords(output)).toEqual([]);
    });

    it('should handle all valid EvidenceType values', () => {
      const output = `\`\`\`json
[
  {
    "type": "Screenshot",
    "capturedAt": "2026-03-09T12:00:00Z",
    "description": "Screenshot evidence",
    "relativePath": ".shep/evidence/screenshot.png"
  },
  {
    "type": "Video",
    "capturedAt": "2026-03-09T12:01:00Z",
    "description": "Video evidence",
    "relativePath": ".shep/evidence/video.mp4"
  },
  {
    "type": "TestOutput",
    "capturedAt": "2026-03-09T12:02:00Z",
    "description": "Test output evidence",
    "relativePath": ".shep/evidence/tests.txt"
  },
  {
    "type": "TerminalRecording",
    "capturedAt": "2026-03-09T12:03:00Z",
    "description": "Terminal recording evidence",
    "relativePath": ".shep/evidence/terminal.txt"
  }
]
\`\`\``;

      const result = parseEvidenceRecords(output);
      expect(result).toHaveLength(4);
      expect(result[0].type).toBe(EvidenceType.Screenshot);
      expect(result[1].type).toBe(EvidenceType.Video);
      expect(result[2].type).toBe(EvidenceType.TestOutput);
      expect(result[3].type).toBe(EvidenceType.TerminalRecording);
    });
  });

  describe('validateUiEvidenceHasAppProof', () => {
    function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
      return {
        type: EvidenceType.Screenshot,
        capturedAt: '2026-03-09T12:00:00Z',
        description: 'App: dashboard page showing new toggle',
        relativePath: '.shep/evidence/app-dashboard.png',
        ...overrides,
      };
    }

    it('should return valid when evidence has app-level screenshots', () => {
      const evidence: Evidence[] = [
        makeEvidence({ description: 'App: settings page with updated layout' }),
        makeEvidence({
          type: EvidenceType.TestOutput,
          description: 'Unit tests passing',
          relativePath: '.shep/evidence/tests.txt',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasScreenshots).toBe(true);
      expect(result.hasAppScreenshots).toBe(true);
      expect(result.hasOnlyStorybookScreenshots).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return invalid when evidence has only storybook screenshots', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Storybook: toggle component in default state',
          relativePath: '.shep/evidence/storybook-toggle.png',
        }),
        makeEvidence({
          description: 'Storybook: toggle component in active state',
          relativePath: '.shep/evidence/storybook-toggle-active.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasScreenshots).toBe(true);
      expect(result.hasAppScreenshots).toBe(false);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('Storybook');
    });

    it('should return valid when evidence has both app and storybook screenshots', () => {
      const evidence: Evidence[] = [
        makeEvidence({ description: 'App: dashboard page with new toggle' }),
        makeEvidence({
          description: 'Storybook: toggle component isolated view',
          relativePath: '.shep/evidence/storybook-toggle.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasScreenshots).toBe(true);
      expect(result.hasAppScreenshots).toBe(true);
      expect(result.hasOnlyStorybookScreenshots).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid with no warnings when no screenshots exist', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          type: EvidenceType.TestOutput,
          description: 'Unit tests',
          relativePath: '.shep/evidence/tests.txt',
        }),
        makeEvidence({
          type: EvidenceType.TerminalRecording,
          description: 'CLI output',
          relativePath: '.shep/evidence/cli.txt',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasScreenshots).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should return valid with no warnings for empty evidence array', () => {
      const result = validateUiEvidenceHasAppProof([]);
      expect(result.valid).toBe(true);
      expect(result.hasScreenshots).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect storybook in relativePath even without description match', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Component in default state',
          relativePath: '.shep/evidence/storybook-component.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
    });

    it('should detect storybook via "story" keyword in description', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Story view of the button component',
          relativePath: '.shep/evidence/button.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
    });

    it('should detect storybook via port 6006 in description', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Component at localhost:6006',
          relativePath: '.shep/evidence/component.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
    });

    it('should treat screenshots without storybook keywords as app evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Homepage showing new feature banner',
          relativePath: '.shep/evidence/homepage.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasAppScreenshots).toBe(true);
      expect(result.hasOnlyStorybookScreenshots).toBe(false);
    });

    it('should treat Video type as visual evidence for validation', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          type: EvidenceType.Video,
          description: 'Storybook: recording of component interaction',
          relativePath: '.shep/evidence/storybook-recording.mp4',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasScreenshots).toBe(true);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
    });

    it('should treat app-prefixed descriptions as app evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({ description: 'App: control center with new sidebar' }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasAppScreenshots).toBe(true);
    });

    it('should treat "dev server" descriptions as app evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({ description: 'Dev server showing updated dashboard' }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(true);
      expect(result.hasAppScreenshots).toBe(true);
    });

    it('should detect "stories" keyword as storybook evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Component stories showing all variants',
          relativePath: '.shep/evidence/component-stories.png',
        }),
      ];

      const result = validateUiEvidenceHasAppProof(evidence);
      expect(result.valid).toBe(false);
      expect(result.hasOnlyStorybookScreenshots).toBe(true);
    });
  });

  // =====================================================================
  // inferTaskTypes
  // =====================================================================
  describe('inferTaskTypes', () => {
    it('should return ["ui"] for tasks mentioning "component" in description', () => {
      const task: TaskForValidation = {
        id: 'task-1',
        title: 'Add toggle',
        description: 'Add toggle component to settings page',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "UI" in description', () => {
      const task: TaskForValidation = {
        id: 'task-2',
        title: 'Update UI',
        description: 'Update the UI for the dashboard',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "page" in description', () => {
      const task: TaskForValidation = {
        id: 'task-3',
        title: 'New page',
        description: 'Create the settings page layout',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "style" in description (case-insensitive)', () => {
      const task: TaskForValidation = {
        id: 'task-4',
        title: 'Styling',
        description: 'update STYLE for button',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "layout" in description', () => {
      const task: TaskForValidation = {
        id: 'task-5',
        title: 'Layout fix',
        description: 'Fix the grid layout on mobile',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "markup" in description', () => {
      const task: TaskForValidation = {
        id: 'task-6',
        title: 'Markup change',
        description: 'Update HTML markup for accessibility',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks mentioning "visual" in description', () => {
      const task: TaskForValidation = {
        id: 'task-7',
        title: 'Visual update',
        description: 'Make visual changes to the header',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["ui"] for tasks with UI keywords in acceptanceCriteria', () => {
      const task: TaskForValidation = {
        id: 'task-8',
        title: 'Feature X',
        description: 'Implement feature X',
        acceptanceCriteria: ['The component renders correctly in the sidebar'],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should return ["test"] for tasks mentioning "test" in acceptanceCriteria', () => {
      const task: TaskForValidation = {
        id: 'task-9',
        title: 'Validation logic',
        description: 'Implement validation logic',
        acceptanceCriteria: ['Write unit tests for validation'],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['test']);
    });

    it('should return ["test"] for tasks with non-null tdd field', () => {
      const task: TaskForValidation = {
        id: 'task-10',
        title: 'Add helper',
        description: 'Add a helper function',
        acceptanceCriteria: [],
        tdd: { red: ['Write failing test'], green: ['Implement'], refactor: [] },
      };
      expect(inferTaskTypes(task)).toEqual(['test']);
    });

    it('should return ["test"] for tasks mentioning "spec" in description', () => {
      const task: TaskForValidation = {
        id: 'task-11',
        title: 'Test specs',
        description: 'Write spec for the parser module',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['test']);
    });

    it('should return ["test"] for tasks mentioning "unit test" in description', () => {
      const task: TaskForValidation = {
        id: 'task-12',
        title: 'Unit tests',
        description: 'Write unit test coverage for the service',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['test']);
    });

    it('should return ["test"] for tasks mentioning "integration test" in description', () => {
      const task: TaskForValidation = {
        id: 'task-13',
        title: 'Integration tests',
        description: 'Add integration test for the API endpoint',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['test']);
    });

    it('should return ["cli"] for tasks mentioning "CLI" in description', () => {
      const task: TaskForValidation = {
        id: 'task-14',
        title: 'CLI export',
        description: 'Add CLI command for export',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['cli']);
    });

    it('should return ["cli"] for tasks mentioning "command" in description', () => {
      const task: TaskForValidation = {
        id: 'task-15',
        title: 'New command',
        description: 'Implement a new shell command to list features',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['cli']);
    });

    it('should return ["cli"] for tasks mentioning "terminal" in description', () => {
      const task: TaskForValidation = {
        id: 'task-16',
        title: 'Terminal output',
        description: 'Improve terminal output formatting',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['cli']);
    });

    it('should return ["cli"] for tasks mentioning "shell" in description', () => {
      const task: TaskForValidation = {
        id: 'task-17',
        title: 'Shell script',
        description: 'Add a shell integration for auto-complete',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['cli']);
    });

    it('should return multiple types for tasks matching multiple categories', () => {
      const task: TaskForValidation = {
        id: 'task-18',
        title: 'UI + tests',
        description: 'Add UI component with unit tests',
        acceptanceCriteria: [],
        tdd: null,
      };
      const types = inferTaskTypes(task);
      expect(types).toContain('ui');
      expect(types).toContain('test');
      expect(types).toHaveLength(2);
    });

    it('should return [] for tasks with no clear type signals', () => {
      const task: TaskForValidation = {
        id: 'task-19',
        title: 'Refactor logic',
        description: 'Refactor internal logic for better performance',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual([]);
    });

    it('should be case-insensitive for keyword matching', () => {
      const task: TaskForValidation = {
        id: 'task-20',
        title: 'LAYOUT',
        description: 'Update LAYOUT and VISUAL elements for COMPONENT',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual(['ui']);
    });

    it('should handle missing optional fields gracefully', () => {
      const task: TaskForValidation = {
        id: 'task-21',
        title: 'Minimal task',
        description: 'Do something',
        acceptanceCriteria: [],
        tdd: null,
      };
      expect(inferTaskTypes(task)).toEqual([]);
    });
  });

  // =====================================================================
  // validateEvidenceCompleteness
  // =====================================================================
  describe('validateEvidenceCompleteness', () => {
    function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
      return {
        type: EvidenceType.Screenshot,
        capturedAt: '2026-03-09T12:00:00Z',
        description: 'App: dashboard page showing new toggle',
        relativePath: '.shep/evidence/app-dashboard.png',
        ...overrides,
      };
    }

    const uiTask: TaskForValidation = {
      id: 'task-1',
      title: 'Add toggle component',
      description: 'Add toggle component to settings page',
      acceptanceCriteria: [],
      tdd: null,
    };

    const testTask: TaskForValidation = {
      id: 'task-2',
      title: 'Write unit tests',
      description: 'Write unit tests for validation logic',
      acceptanceCriteria: [],
      tdd: { red: ['Write failing test'], green: ['Implement'], refactor: [] },
    };

    const cliTask: TaskForValidation = {
      id: 'task-3',
      title: 'Add CLI export',
      description: 'Add CLI command for export functionality',
      acceptanceCriteria: [],
      tdd: null,
    };

    const genericTask: TaskForValidation = {
      id: 'task-4',
      title: 'Refactor logic',
      description: 'Refactor internal data flow',
      acceptanceCriteria: [],
      tdd: null,
    };

    it('should return valid when all tasks have matching evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({ description: 'App: settings page with toggle', taskRef: 'task-1' }),
        makeEvidence({
          type: EvidenceType.TestOutput,
          description: 'Unit test results',
          relativePath: '.shep/evidence/test-results.txt',
          taskRef: 'task-2',
        }),
        makeEvidence({
          type: EvidenceType.TerminalRecording,
          description: 'CLI export command output',
          relativePath: '.shep/evidence/cli-output.txt',
          taskRef: 'task-3',
        }),
      ];
      const result = validateEvidenceCompleteness(evidence, [uiTask, testTask, cliTask]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return error when UI task has no Screenshot evidence', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          type: EvidenceType.TestOutput,
          description: 'Test results',
          relativePath: '.shep/evidence/tests.txt',
        }),
      ];
      const result = validateEvidenceCompleteness(evidence, [uiTask]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('ui');
      expect(result.errors[0].taskId).toBe('task-1');
      expect(result.errors[0].taskTitle).toBe('Add toggle component');
      expect(result.errors[0].message).toBeTruthy();
    });

    it('should return error when UI task has only Storybook screenshots', () => {
      const evidence: Evidence[] = [
        makeEvidence({
          description: 'Storybook: toggle component in default state',
          relativePath: '.shep/evidence/storybook-toggle.png',
        }),
      ];
      const result = validateEvidenceCompleteness(evidence, [uiTask]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'ui')).toBe(true);
    });

    it('should return error when test task has no TestOutput evidence', () => {
      const evidence: Evidence[] = [makeEvidence({ description: 'App: screenshot of something' })];
      const result = validateEvidenceCompleteness(evidence, [testTask]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('completeness');
      expect(result.errors[0].taskId).toBe('task-2');
    });

    it('should return error when CLI task has no TerminalRecording evidence', () => {
      const evidence: Evidence[] = [makeEvidence({ description: 'App: some screenshot' })];
      const result = validateEvidenceCompleteness(evidence, [cliTask]);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('completeness');
      expect(result.errors[0].taskId).toBe('task-3');
    });

    it('should return multiple errors when multiple tasks lack evidence', () => {
      const evidence: Evidence[] = [];
      const result = validateEvidenceCompleteness(evidence, [uiTask, testTask, cliTask]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('should skip tasks with no inferred type (no completeness requirement)', () => {
      const evidence: Evidence[] = [];
      const result = validateEvidenceCompleteness(evidence, [genericTask]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return valid for empty tasks array', () => {
      const evidence: Evidence[] = [makeEvidence()];
      const result = validateEvidenceCompleteness(evidence, []);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return errors for typed tasks when evidence array is empty', () => {
      const result = validateEvidenceCompleteness([], [uiTask, testTask]);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should have human-readable error messages', () => {
      const result = validateEvidenceCompleteness([], [uiTask]);
      expect(result.valid).toBe(false);
      for (const error of result.errors) {
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.message).toContain('task-1');
      }
    });
  });

  // =====================================================================
  // validateFileExistence
  // =====================================================================
  describe('validateFileExistence', () => {
    beforeEach(() => {
      mockStat.mockReset();
    });

    it('should return empty array when all evidence files exist with content', async () => {
      mockStat.mockResolvedValue({ size: 1024 });
      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Homepage screenshot',
          relativePath: '.shep/evidence/homepage.png',
        },
      ];
      const errors = await validateFileExistence(evidence);
      expect(errors).toEqual([]);
    });

    it('should return error when file does not exist (ENOENT)', async () => {
      const enoent = new Error('ENOENT: no such file or directory') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      mockStat.mockRejectedValue(enoent);

      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Missing screenshot',
          relativePath: '.shep/evidence/missing.png',
        },
      ];
      const errors = await validateFileExistence(evidence);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('.shep/evidence/missing.png');
    });

    it('should return error when file has zero size', async () => {
      mockStat.mockResolvedValue({ size: 0 });

      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Empty file',
          relativePath: '.shep/evidence/empty.png',
        },
      ];
      const errors = await validateFileExistence(evidence);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('zero size');
    });

    it('should return error when file is not accessible (EACCES)', async () => {
      const eacces = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
      eacces.code = 'EACCES';
      mockStat.mockRejectedValue(eacces);

      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Protected file',
          relativePath: '.shep/evidence/protected.png',
        },
      ];
      const errors = await validateFileExistence(evidence);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('.shep/evidence/protected.png');
    });

    it('should return error for each missing file when multiple are missing', async () => {
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      mockStat.mockRejectedValue(enoent);

      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Missing 1',
          relativePath: '.shep/evidence/a.png',
        },
        {
          type: EvidenceType.TestOutput,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Missing 2',
          relativePath: '.shep/evidence/b.txt',
        },
      ];
      const errors = await validateFileExistence(evidence);
      expect(errors).toHaveLength(2);
    });

    it('should return empty array for empty evidence array', async () => {
      const errors = await validateFileExistence([]);
      expect(errors).toEqual([]);
    });

    it('should never throw — returns errors as strings', async () => {
      const weird = new Error('Unknown FS error');
      mockStat.mockRejectedValue(weird);

      const evidence: Evidence[] = [
        {
          type: EvidenceType.Screenshot,
          capturedAt: '2026-03-09T12:00:00Z',
          description: 'Bad file',
          relativePath: '.shep/evidence/bad.png',
        },
      ];
      // Should not throw
      const errors = await validateFileExistence(evidence);
      expect(errors).toHaveLength(1);
    });
  });

  // =====================================================================
  // validateEvidence (full pipeline)
  // =====================================================================
  describe('validateEvidence', () => {
    beforeEach(() => {
      mockStat.mockReset();
    });

    function makeEv(overrides: Partial<Evidence> = {}): Evidence {
      return {
        type: EvidenceType.Screenshot,
        capturedAt: '2026-03-09T12:00:00Z',
        description: 'App: dashboard page',
        relativePath: '.shep/evidence/app-dashboard.png',
        ...overrides,
      };
    }

    const uiTask: TaskForValidation = {
      id: 'task-1',
      title: 'Add toggle component',
      description: 'Add toggle component to settings page',
      acceptanceCriteria: [],
      tdd: null,
    };

    it('should return valid when both completeness and file existence pass', async () => {
      mockStat.mockResolvedValue({ size: 1024 });

      const evidence: Evidence[] = [makeEv({ description: 'App: settings page with toggle' })];
      const result = await validateEvidence(evidence, [uiTask]);
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should return completeness errors when files exist but evidence is insufficient', async () => {
      mockStat.mockResolvedValue({ size: 1024 });

      const evidence: Evidence[] = [
        makeEv({
          type: EvidenceType.TestOutput,
          description: 'Test results',
          relativePath: '.shep/evidence/tests.txt',
        }),
      ];
      const result = await validateEvidence(evidence, [uiTask]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'ui')).toBe(true);
    });

    it('should return file existence errors when completeness passes but files missing', async () => {
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      mockStat.mockRejectedValue(enoent);

      const genericTask: TaskForValidation = {
        id: 'task-5',
        title: 'Refactor logic',
        description: 'Refactor internal data flow',
        acceptanceCriteria: [],
        tdd: null,
      };

      const evidence: Evidence[] = [makeEv()];
      const result = await validateEvidence(evidence, [genericTask]);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.type === 'fileExistence')).toBe(true);
    });

    it('should return merged errors when both fail', async () => {
      const enoent = new Error('ENOENT') as NodeJS.ErrnoException;
      enoent.code = 'ENOENT';
      mockStat.mockRejectedValue(enoent);

      const testTask: TaskForValidation = {
        id: 'task-2',
        title: 'Add tests',
        description: 'Write unit tests for the service',
        acceptanceCriteria: [],
        tdd: null,
      };
      const evidence: Evidence[] = [
        makeEv({
          type: EvidenceType.Screenshot,
          description: 'App: dashboard',
          relativePath: '.shep/evidence/missing.png',
        }),
      ];
      const result = await validateEvidence(evidence, [testTask]);
      expect(result.valid).toBe(false);
      const types = result.errors.map((e) => e.type);
      expect(types).toContain('completeness');
      expect(types).toContain('fileExistence');
    });
  });
});

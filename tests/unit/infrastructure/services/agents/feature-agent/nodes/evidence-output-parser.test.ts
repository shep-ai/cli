import { describe, it, expect } from 'vitest';
import {
  parseEvidenceRecords,
  validateUiEvidenceHasAppProof,
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
});

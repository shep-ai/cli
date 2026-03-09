import { describe, it, expect } from 'vitest';
import { parseEvidenceRecords } from '../../../../../../../packages/core/src/infrastructure/services/agents/feature-agent/nodes/evidence-output-parser.js';
import { EvidenceType } from '../../../../../../../packages/core/src/domain/generated/output.js';

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
});

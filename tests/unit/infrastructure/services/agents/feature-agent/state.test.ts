import 'reflect-metadata';
import { describe, it, expect } from 'vitest';
import {
  FeatureAgentAnnotation,
  type FeatureAgentState,
} from '@/infrastructure/services/agents/feature-agent/state.js';

describe('FeatureAgentAnnotation', () => {
  describe('merge state channels exist on type', () => {
    it('should include prUrl, prNumber, commitHash, ciStatus in FeatureAgentState', () => {
      // Verify these fields exist on the Annotation spec (runtime check)
      const spec = FeatureAgentAnnotation.spec;
      expect(spec).toHaveProperty('prUrl');
      expect(spec).toHaveProperty('prNumber');
      expect(spec).toHaveProperty('commitHash');
      expect(spec).toHaveProperty('ciStatus');
    });

    it('should include openPr, autoMerge, allowMerge boolean flags', () => {
      const spec = FeatureAgentAnnotation.spec;
      expect(spec).toHaveProperty('openPr');
      expect(spec).toHaveProperty('autoMerge');
      expect(spec).toHaveProperty('allowMerge');
    });
  });

  describe('FeatureAgentAnnotation structure', () => {
    it('should be a valid LangGraph Annotation root', () => {
      expect(FeatureAgentAnnotation).toBeDefined();
      expect(FeatureAgentAnnotation.spec).toBeDefined();
    });

    it('should have all 18 channels', () => {
      const channelNames = Object.keys(FeatureAgentAnnotation.spec);
      // Original: featureId, repositoryPath, specDir, worktreePath, currentNode, error,
      //           approvalGates, messages, validationRetries, lastValidationTarget, lastValidationErrors
      // New:      prUrl, prNumber, commitHash, ciStatus, openPr, autoMerge, allowMerge
      expect(channelNames).toContain('prUrl');
      expect(channelNames).toContain('prNumber');
      expect(channelNames).toContain('commitHash');
      expect(channelNames).toContain('ciStatus');
      expect(channelNames).toContain('openPr');
      expect(channelNames).toContain('autoMerge');
      expect(channelNames).toContain('allowMerge');
      expect(channelNames.length).toBe(18);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  featureNodeStateConfig,
  lifecycleStageIcons,
  actionRequiredLifecycleIcons,
  type FeatureLifecyclePhase,
} from '@/components/common/feature-node';
import { FileText, Search, Code, GitPullRequest, Rocket, Wrench, GitMerge } from 'lucide-react';

const allLifecyclePhases: FeatureLifecyclePhase[] = [
  'requirements',
  'research',
  'implementation',
  'review',
  'deploy',
  'maintain',
];

describe('lifecycleStageIcons', () => {
  it('has an entry for every lifecycle phase', () => {
    for (const phase of allLifecyclePhases) {
      expect(lifecycleStageIcons[phase]).toBeDefined();
    }
  });

  it('maps requirements to FileText', () => {
    expect(lifecycleStageIcons.requirements).toBe(FileText);
  });

  it('maps research to Search', () => {
    expect(lifecycleStageIcons.research).toBe(Search);
  });

  it('maps implementation to Code', () => {
    expect(lifecycleStageIcons.implementation).toBe(Code);
  });

  it('maps review to GitPullRequest', () => {
    expect(lifecycleStageIcons.review).toBe(GitPullRequest);
  });

  it('maps deploy to Rocket', () => {
    expect(lifecycleStageIcons.deploy).toBe(Rocket);
  });

  it('maps maintain to Wrench', () => {
    expect(lifecycleStageIcons.maintain).toBe(Wrench);
  });
});

describe('featureNodeStateConfig - dead code removal', () => {
  it('does not include showProgressBar in any state config', () => {
    for (const [, config] of Object.entries(featureNodeStateConfig)) {
      expect(config).not.toHaveProperty('showProgressBar');
    }
  });

  it('state config records contain only expected keys', () => {
    const expectedKeys = [
      'icon',
      'borderClass',
      'labelClass',
      'progressClass',
      'badgeClass',
      'badgeBgClass',
      'label',
    ];
    for (const [, config] of Object.entries(featureNodeStateConfig)) {
      expect(Object.keys(config).sort()).toEqual(expectedKeys.sort());
    }
  });
});

describe('actionRequiredLifecycleIcons', () => {
  it('maps requirements to FileText', () => {
    expect(actionRequiredLifecycleIcons.requirements).toBe(FileText);
  });

  it('maps implementation to Wrench', () => {
    expect(actionRequiredLifecycleIcons.implementation).toBe(Wrench);
  });

  it('maps review to GitMerge', () => {
    expect(actionRequiredLifecycleIcons.review).toBe(GitMerge);
  });

  it('returns undefined for phases without overrides', () => {
    expect(actionRequiredLifecycleIcons.research).toBeUndefined();
    expect(actionRequiredLifecycleIcons.deploy).toBeUndefined();
    expect(actionRequiredLifecycleIcons.maintain).toBeUndefined();
  });
});

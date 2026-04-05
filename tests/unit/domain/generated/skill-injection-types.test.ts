/**
 * Skill Injection TypeSpec Types Validation Test
 *
 * Verifies SkillSourceType, SkillSource, and SkillInjectionConfig types
 * are correctly generated from TypeSpec and exported from domain output.
 */

import { describe, it, expect } from 'vitest';
import {
  SkillSourceType,
  type SkillSource,
  type SkillInjectionConfig,
  type WorkflowConfig,
} from '@/domain/generated/output.js';

describe('SkillSourceType enum', () => {
  it('should have Local variant with value "local"', () => {
    expect(SkillSourceType.Local).toBe('local');
  });

  it('should have Remote variant with value "remote"', () => {
    expect(SkillSourceType.Remote).toBe('remote');
  });

  it('should only have two variants', () => {
    const values = Object.values(SkillSourceType);
    expect(values).toHaveLength(2);
    expect(values).toContain('local');
    expect(values).toContain('remote');
  });
});

describe('SkillSource type', () => {
  it('should accept a valid local skill source', () => {
    const source: SkillSource = {
      name: 'architecture-reviewer',
      type: SkillSourceType.Local,
      source: '.claude/skills/architecture-reviewer',
    };
    expect(source.name).toBe('architecture-reviewer');
    expect(source.type).toBe('local');
    expect(source.source).toBe('.claude/skills/architecture-reviewer');
    expect(source.remoteSkillName).toBeUndefined();
  });

  it('should accept a valid remote skill source with remoteSkillName', () => {
    const source: SkillSource = {
      name: 'frontend-design',
      type: SkillSourceType.Remote,
      source: '@anthropic/skills',
      remoteSkillName: 'frontend-design',
    };
    expect(source.name).toBe('frontend-design');
    expect(source.type).toBe('remote');
    expect(source.remoteSkillName).toBe('frontend-design');
  });
});

describe('SkillInjectionConfig type', () => {
  it('should accept a config with enabled false and empty skills', () => {
    const config: SkillInjectionConfig = {
      enabled: false,
      skills: [],
    };
    expect(config.enabled).toBe(false);
    expect(config.skills).toHaveLength(0);
  });

  it('should accept a config with skills list', () => {
    const config: SkillInjectionConfig = {
      enabled: true,
      skills: [
        {
          name: 'tsp-model',
          type: SkillSourceType.Local,
          source: '.claude/skills/tsp-model',
        },
      ],
    };
    expect(config.enabled).toBe(true);
    expect(config.skills).toHaveLength(1);
    expect(config.skills[0].name).toBe('tsp-model');
  });
});

describe('WorkflowConfig.skillInjection', () => {
  it('should accept skillInjection as an optional field', () => {
    const workflow = {} as WorkflowConfig;
    // skillInjection is optional — accessing it should be undefined when not set
    expect(workflow.skillInjection).toBeUndefined();
  });
});

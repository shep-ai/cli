import type { Meta, StoryObj } from '@storybook/react';
import { SkillSourceType, type SkillInjectionConfig } from '@shepai/core/domain/generated/output';
import { AutoInjectedSkillsSection } from './auto-injected-skills-section';
import type { SkillData } from '@/lib/skills';

const meta = {
  title: 'Features/Skills/AutoInjectedSkillsSection',
  component: AutoInjectedSkillsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AutoInjectedSkillsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleConfig: SkillInjectionConfig = {
  enabled: true,
  skills: [
    {
      name: 'architecture-reviewer',
      type: SkillSourceType.Local,
      source: '.claude/skills/architecture-reviewer',
    },
    { name: 'tsp-model', type: SkillSourceType.Local, source: '.claude/skills/tsp-model' },
    {
      name: 'remotion-best-practices',
      type: SkillSourceType.Remote,
      source: '@anthropic/remotion-skills',
      remoteSkillName: 'remotion-best-practices',
    },
  ],
};

const sampleDiscoveredSkills: SkillData[] = [
  {
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Review architecture decisions against Clean Architecture principles',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'cross-validate-artifacts',
    displayName: 'cross-validate-artifacts',
    description: 'Cross-validate documentation and artifacts across the codebase',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
];

export const Default: Story = {
  args: {
    config: sampleConfig,
    discoveredSkills: sampleDiscoveredSkills,
  },
};

export const SingleSkill: Story = {
  args: {
    config: {
      enabled: true,
      skills: [sampleConfig.skills[0]],
    },
    discoveredSkills: sampleDiscoveredSkills,
  },
};

export const EmptySkills: Story = {
  args: {
    config: { enabled: true, skills: [] },
    discoveredSkills: sampleDiscoveredSkills,
  },
};

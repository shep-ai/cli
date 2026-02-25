import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SkillCard } from './skill-card';
import type { SkillData } from '@/lib/skills';

const meta: Meta<typeof SkillCard> = {
  title: 'Features/SkillCard',
  component: SkillCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const baseSkill: SkillData = {
  name: 'shep-kit:implement',
  displayName: 'implement',
  description: 'Validate specs and autonomously execute implementation tasks with status tracking.',
  category: 'Workflow',
  source: 'project',
  body: '## Usage\n\nRun /shep-kit:implement after planning is complete.',
  resources: [],
};

const skillWithAllBadges: SkillData = {
  name: 'shep:ui-component',
  displayName: 'ui-component',
  description:
    'Use when creating, modifying, or reviewing web UI components. Triggers include "new component", "add component", "create UI".',
  context: 'fork',
  allowedTools: 'Read, Write, Bash, Edit, Glob',
  category: 'Code Generation',
  source: 'project',
  body: '## Overview\n\nScaffolds UI components following the four-tier hierarchy.',
  resources: [
    { name: 'references', fileCount: 7 },
    { name: 'templates', fileCount: 3 },
    { name: 'rules', fileCount: 2 },
  ],
};

const globalSkill: SkillData = {
  name: 'vercel-react-best-practices',
  displayName: 'vercel-react-best-practices',
  description: 'React and Next.js performance optimization guidelines from Vercel Engineering.',
  category: 'Reference',
  source: 'global',
  body: 'Performance patterns for React and Next.js applications.',
  resources: [{ name: 'references', fileCount: 4 }],
};

const skillWithContext: SkillData = {
  name: 'architecture-reviewer',
  displayName: 'architecture-reviewer',
  description: 'Use when making architectural decisions, planning features, or reviewing PRs.',
  context: 'fork',
  category: 'Analysis',
  source: 'project',
  body: '',
  resources: [],
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    skill: baseSkill,
  },
};

export const WithContext: Story = {
  args: {
    skill: skillWithContext,
  },
};

export const WithAllBadges: Story = {
  args: {
    skill: skillWithAllBadges,
  },
};

export const ProjectSource: Story = {
  args: {
    skill: baseSkill,
  },
};

export const GlobalSource: Story = {
  args: {
    skill: globalSkill,
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import { SkillsPageClient } from './skills-page-client';
import type { SkillData } from '@/lib/skills';

const meta = {
  title: 'Features/SkillsPageClient',
  component: SkillsPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SkillsPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const sampleSkills: SkillData[] = [
  {
    name: 'shep-kit:implement',
    displayName: 'implement',
    description:
      'Validate specs and autonomously execute implementation tasks with status tracking.',
    category: 'Workflow',
    source: 'project',
    body: '## Usage\n\nRun /shep-kit:implement after planning is complete.',
    resources: [],
  },
  {
    name: 'shep-kit:plan',
    displayName: 'plan',
    description: 'Create implementation plan and task breakdown.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shep-kit:research',
    displayName: 'research',
    description: 'Analyze technical approach, evaluate libraries, document decisions.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shep:ui-component',
    displayName: 'ui-component',
    description: 'Use when creating, modifying, or reviewing web UI components.',
    context: 'fork',
    allowedTools: 'Read, Write, Bash, Edit, Glob',
    category: 'Code Generation',
    source: 'project',
    body: '',
    resources: [
      { name: 'references', fileCount: 7 },
      { name: 'templates', fileCount: 3 },
    ],
  },
  {
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Use when making architectural decisions, planning features, or reviewing PRs.',
    context: 'fork',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'cross-validate-artifacts',
    displayName: 'cross-validate-artifacts',
    description: 'Cross-validate documentation and artifacts for consistency.',
    category: 'Analysis',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shadcn-ui',
    displayName: 'shadcn-ui',
    description: 'Complete shadcn/ui component library patterns and implementation.',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [{ name: 'references', fileCount: 3 }],
  },
  {
    name: 'vercel-react-best-practices',
    displayName: 'vercel-react-best-practices',
    description: 'React and Next.js performance optimization guidelines from Vercel Engineering.',
    category: 'Reference',
    source: 'global',
    body: '',
    resources: [{ name: 'references', fileCount: 4 }],
  },
];

const manySkills: SkillData[] = [
  ...sampleSkills,
  {
    name: 'shep-kit:commit-pr',
    displayName: 'commit-pr',
    description: 'Use when ready to commit, push, and create a PR with CI verification.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shep-kit:new-feature',
    displayName: 'new-feature',
    description: 'Use when starting any new feature, functionality, or enhancement.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shep-kit:new-feature-fast',
    displayName: 'new-feature-fast',
    description: 'Fast-track feature creation that collapses new-feature, research, and planning.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'shep-kit:merged',
    displayName: 'merged',
    description: 'Use after a PR has been merged to clean up branches.',
    category: 'Workflow',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'mermaid-diagrams',
    displayName: 'mermaid-diagrams',
    description: 'Comprehensive guide for creating software diagrams using Mermaid syntax.',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [{ name: 'references', fileCount: 2 }],
  },
  {
    name: 'react-flow',
    displayName: 'react-flow',
    description: 'React Flow for workflow visualization with custom nodes and edges.',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [],
  },
  {
    name: 'tsp-model',
    displayName: 'tsp-model',
    description: 'Use when creating, modifying, or documenting TypeSpec domain models.',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [{ name: 'references', fileCount: 5 }],
  },
  {
    name: 'find-skills',
    displayName: 'find-skills',
    description: 'Helps users discover and install agent skills.',
    category: 'Reference',
    source: 'global',
    body: '',
    resources: [],
  },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    skills: sampleSkills,
  },
};

export const Empty: Story = {
  args: {
    skills: [],
  },
};

export const ManySkills: Story = {
  args: {
    skills: manySkills,
  },
};

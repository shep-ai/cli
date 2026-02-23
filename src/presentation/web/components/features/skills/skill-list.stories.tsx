import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { SkillList } from './skill-list';
import type { SkillData } from '@/lib/skills';

const meta: Meta<typeof SkillList> = {
  title: 'Features/SkillList',
  component: SkillList,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onSkillSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const workflowSkills: SkillData[] = [
  {
    name: 'shep-kit:implement',
    displayName: 'implement',
    description: 'Validate specs and autonomously execute implementation tasks.',
    category: 'Workflow',
    source: 'project',
    body: '',
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
];

const codeGenSkills: SkillData[] = [
  {
    name: 'shep:ui-component',
    displayName: 'ui-component',
    description: 'Use when creating, modifying, or reviewing web UI components.',
    context: 'fork',
    allowedTools: 'Read, Write, Bash, Edit, Glob',
    category: 'Code Generation',
    source: 'project',
    body: '',
    resources: [{ name: 'references', fileCount: 7 }],
  },
];

const analysisSkills: SkillData[] = [
  {
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Use when making architectural decisions or reviewing PRs.',
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
];

const referenceSkills: SkillData[] = [
  {
    name: 'shadcn-ui',
    displayName: 'shadcn-ui',
    description: 'Complete shadcn/ui component library patterns.',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [{ name: 'references', fileCount: 3 }],
  },
  {
    name: 'vercel-react-best-practices',
    displayName: 'vercel-react-best-practices',
    description: 'React and Next.js performance optimization guidelines.',
    category: 'Reference',
    source: 'global',
    body: '',
    resources: [{ name: 'references', fileCount: 4 }],
  },
];

const allSkills: SkillData[] = [
  ...workflowSkills,
  ...codeGenSkills,
  ...analysisSkills,
  ...referenceSkills,
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    skills: allSkills,
  },
};

export const SingleCategory: Story = {
  args: {
    skills: workflowSkills,
  },
};

export const Empty: Story = {
  args: {
    skills: [],
  },
};

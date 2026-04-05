import type { Meta, StoryObj } from '@storybook/react';
import { AddSkillDialog } from './add-skill-dialog';
import type { SkillData } from '@/lib/skills';

const meta = {
  title: 'Features/Skills/AddSkillDialog',
  component: AddSkillDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AddSkillDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

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
  {
    name: 'tsp-model',
    displayName: 'tsp-model',
    description: 'Create and modify TypeSpec domain models',
    category: 'Code Generation',
    source: 'project',
    body: '',
    resources: [],
  },
];

export const Default: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: [],
  },
};

export const SomeAlreadyConfigured: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: ['architecture-reviewer'],
  },
};

export const AllConfigured: Story = {
  args: {
    open: true,
    onOpenChange: () => undefined,
    onAdded: () => undefined,
    discoveredSkills: sampleDiscoveredSkills,
    existingSkillNames: ['architecture-reviewer', 'cross-validate-artifacts', 'tsp-model'],
  },
};

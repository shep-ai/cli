import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SkillDetailDrawer } from './skill-detail-drawer';
import { Button } from '@/components/ui/button';
import type { SkillData } from '@/lib/skills';

const meta: Meta<typeof SkillDetailDrawer> = {
  title: 'Features/SkillDetailDrawer',
  component: SkillDetailDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SkillDetailDrawer>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const skillWithResources: SkillData = {
  name: 'shep:ui-component',
  displayName: 'ui-component',
  description:
    'Use when creating, modifying, or reviewing web UI components. Triggers include "new component", "add component", "create UI", "build a widget".',
  context: 'fork',
  allowedTools: 'Read, Write, Bash, Edit, Glob, Grep',
  category: 'Code Generation',
  source: 'project',
  body: '## Overview\n\nScaffolds UI components following the four-tier hierarchy.\n\n## Usage\n\nRun /shep:ui-component when you need to create or modify components.',
  resources: [
    { name: 'references', fileCount: 7 },
    { name: 'templates', fileCount: 3 },
    { name: 'rules', fileCount: 2 },
  ],
};

const skillWithoutResources: SkillData = {
  name: 'shep-kit:implement',
  displayName: 'implement',
  description:
    'Validate specs and autonomously execute implementation tasks with status tracking. Use after /shep-kit:plan when ready to start implementation.',
  category: 'Workflow',
  source: 'project',
  body: '## Usage\n\nRun /shep-kit:implement after planning is complete to start autonomous implementation.\n\n## What it does\n\n1. Pre-Implementation Validation Gate\n2. Autonomous Execution\n3. Status Tracking',
  resources: [],
};

const minimalSkill: SkillData = {
  name: 'find-skills',
  displayName: 'find-skills',
  description: 'Helps users discover and install agent skills.',
  category: 'Reference',
  source: 'global',
  body: '',
  resources: [],
};

/* ---------------------------------------------------------------------------
 * Trigger wrapper — starts closed, click to open
 * ------------------------------------------------------------------------- */

function DrawerTrigger({ skill, label }: { skill: SkillData; label: string }) {
  const [selected, setSelected] = useState<SkillData | null>(null);

  return (
    <div className="flex h-screen items-start p-4">
      <Button variant="outline" onClick={() => setSelected(skill)}>
        {label}
      </Button>
      <SkillDetailDrawer skill={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Open: Story = {
  render: () => <DrawerTrigger skill={skillWithResources} label="Open Skill Detail" />,
};

export const WithResources: Story = {
  render: () => <DrawerTrigger skill={skillWithResources} label="Open With Resources" />,
};

export const WithoutResources: Story = {
  render: () => <DrawerTrigger skill={skillWithoutResources} label="Open Without Resources" />,
};

export const MinimalSkill: Story = {
  render: () => <DrawerTrigger skill={minimalSkill} label="Open Minimal Skill" />,
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CategoryFilter } from './category-filter';
import type { SkillCategory } from '@/lib/skills';

const meta: Meta<typeof CategoryFilter> = {
  title: 'Features/CategoryFilter',
  component: CategoryFilter,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof CategoryFilter>;

/* ---------------------------------------------------------------------------
 * Interactive wrapper — manages activeCategory state
 * ------------------------------------------------------------------------- */

function InteractiveCategoryFilter({
  initial,
  counts,
}: {
  initial: SkillCategory | null;
  counts?: Record<SkillCategory, number>;
}) {
  const [active, setActive] = useState<SkillCategory | null>(initial);
  return <CategoryFilter activeCategory={active} onCategoryChange={setActive} counts={counts} />;
}

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const AllSelected: Story = {
  render: () => <InteractiveCategoryFilter initial={null} />,
};

export const WorkflowSelected: Story = {
  render: () => <InteractiveCategoryFilter initial="Workflow" />,
};

export const WithCounts: Story = {
  render: () => (
    <InteractiveCategoryFilter
      initial={null}
      counts={{
        Workflow: 8,
        'Code Generation': 1,
        Analysis: 2,
        Reference: 7,
      }}
    />
  ),
};

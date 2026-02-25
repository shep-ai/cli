import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillsPageClient } from '@/components/features/skills/skills-page-client';
import type { SkillData } from '@/lib/skills';

function makeSkill(overrides: Partial<SkillData> = {}): SkillData {
  return {
    name: 'shep-kit:implement',
    displayName: 'implement',
    description: 'Validate specs and autonomously execute implementation tasks',
    category: 'Workflow',
    source: 'project',
    body: 'Full body content here.',
    resources: [],
    ...overrides,
  };
}

const sampleSkills: SkillData[] = [
  makeSkill({
    name: 'shep-kit:plan',
    displayName: 'plan',
    description: 'Create implementation plans',
    category: 'Workflow',
  }),
  makeSkill({
    name: 'shep-kit:implement',
    displayName: 'implement',
    description: 'Validate specs and execute tasks',
    category: 'Workflow',
  }),
  makeSkill({
    name: 'shep:ui-component',
    displayName: 'ui-component',
    description: 'Create web UI components',
    category: 'Code Generation',
  }),
  makeSkill({
    name: 'architecture-reviewer',
    displayName: 'architecture-reviewer',
    description: 'Review architecture decisions',
    category: 'Analysis',
  }),
  makeSkill({
    name: 'shadcn-ui',
    displayName: 'shadcn-ui',
    description: 'shadcn/ui component library patterns',
    category: 'Reference',
  }),
];

describe('SkillsPageClient', () => {
  it('renders page header with "Skills" title', () => {
    render(<SkillsPageClient skills={sampleSkills} />);
    expect(screen.getByRole('heading', { level: 1, name: /Skills/ })).toBeInTheDocument();
  });

  it('renders all skills when no filters applied', () => {
    render(<SkillsPageClient skills={sampleSkills} />);
    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shep-kit:implement')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shep:ui-component')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-architecture-reviewer')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shadcn-ui')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<SkillsPageClient skills={sampleSkills} />);
    expect(screen.getByPlaceholderText(/search skills/i)).toBeInTheDocument();
  });

  it('search input filters skills by name', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'plan');

    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shep:ui-component')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shadcn-ui')).not.toBeInTheDocument();
  });

  it('search input filters skills by description', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'architecture');

    expect(screen.getByTestId('skill-card-architecture-reviewer')).toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shep-kit:plan')).not.toBeInTheDocument();
  });

  it('search is case-insensitive', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'PLAN');

    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
  });

  it('category filter shows only skills in selected category', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    await user.click(screen.getByRole('button', { name: /^Analysis/ }));

    expect(screen.getByTestId('skill-card-architecture-reviewer')).toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shep-kit:plan')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shadcn-ui')).not.toBeInTheDocument();
  });

  it('search and category filter combine', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    // Filter to Workflow category
    await user.click(screen.getByRole('button', { name: /^Workflow/ }));
    // Also search for "plan"
    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'plan');

    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
    expect(screen.queryByTestId('skill-card-shep-kit:implement')).not.toBeInTheDocument();
  });

  it('clicking "All" category button shows all categories', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    // First filter to Workflow
    await user.click(screen.getByRole('button', { name: /^Workflow/ }));
    expect(screen.queryByTestId('skill-card-shadcn-ui')).not.toBeInTheDocument();

    // Click "All" to reset
    await user.click(screen.getByRole('button', { name: /^All/ }));
    expect(screen.getByTestId('skill-card-shadcn-ui')).toBeInTheDocument();
  });

  it('shows "No skills found" empty state when skills prop is empty', () => {
    render(<SkillsPageClient skills={[]} />);
    expect(screen.getByText('No skills found')).toBeInTheDocument();
  });

  it('shows "No matching skills" when filters yield no results', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'zzzznonexistent');

    expect(screen.getByText('No matching skills')).toBeInTheDocument();
  });

  it('clears filters when "Clear filters" action is clicked', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    // Apply a search that yields no results
    const searchInput = screen.getByPlaceholderText(/search skills/i);
    await user.type(searchInput, 'zzzznonexistent');
    expect(screen.getByText('No matching skills')).toBeInTheDocument();

    // Click clear filters
    await user.click(screen.getByRole('button', { name: /clear filters/i }));

    // All skills should be visible again
    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shadcn-ui')).toBeInTheDocument();
  });

  it('opens drawer when a skill card is clicked', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    await user.click(screen.getByTestId('skill-card-shep-kit:plan'));

    // Drawer should show the skill detail — description appears in both card and drawer
    const descriptions = screen.getAllByText('Create implementation plans');
    expect(descriptions.length).toBeGreaterThanOrEqual(2);
    // Sheet title shows display name (h2 heading inside sheet)
    const headings = screen.getAllByRole('heading', { name: 'plan' });
    expect(headings.length).toBeGreaterThanOrEqual(1);
  });

  it('closes drawer when dismissed', async () => {
    const user = userEvent.setup();
    render(<SkillsPageClient skills={sampleSkills} />);

    // Open drawer
    await user.click(screen.getByTestId('skill-card-shep-kit:plan'));

    // Close drawer
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // The drawer heading for the skill should be gone
    expect(screen.queryByRole('heading', { name: 'plan' })).not.toBeInTheDocument();
  });

  it('renders category filter with skill counts from full unfiltered list', () => {
    render(<SkillsPageClient skills={sampleSkills} />);

    // Workflow has 2, Code Generation has 1, Analysis has 1, Reference has 1
    const filterGroup = screen.getByRole('group', { name: /filter by category/i });
    expect(within(filterGroup).getByText('(2)')).toBeInTheDocument();
    expect(within(filterGroup).getAllByText('(1)')).toHaveLength(3);
  });
});

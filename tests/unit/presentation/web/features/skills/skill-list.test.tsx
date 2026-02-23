import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillList } from '@/components/features/skills/skill-list';
import type { SkillData } from '@/lib/skills';

function makeSkill(overrides: Partial<SkillData> = {}): SkillData {
  return {
    name: 'test-skill',
    displayName: 'test-skill',
    description: 'A test skill',
    category: 'Reference',
    source: 'project',
    body: '',
    resources: [],
    ...overrides,
  };
}

describe('SkillList', () => {
  it('renders category headings for groups with skills', () => {
    const skills = [
      makeSkill({ name: 'shep-kit:plan', displayName: 'plan', category: 'Workflow' }),
      makeSkill({ name: 'shadcn-ui', displayName: 'shadcn-ui', category: 'Reference' }),
    ];
    render(<SkillList skills={skills} onSkillSelect={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Workflow/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Reference/ })).toBeInTheDocument();
  });

  it('does not render heading for empty categories', () => {
    const skills = [
      makeSkill({ name: 'shep-kit:plan', displayName: 'plan', category: 'Workflow' }),
    ];
    render(<SkillList skills={skills} onSkillSelect={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Workflow/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Analysis/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Reference/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Code Generation/ })).not.toBeInTheDocument();
  });

  it('shows skill count in category heading', () => {
    const skills = [
      makeSkill({ name: 'shep-kit:plan', displayName: 'plan', category: 'Workflow' }),
      makeSkill({ name: 'shep-kit:implement', displayName: 'implement', category: 'Workflow' }),
    ];
    render(<SkillList skills={skills} onSkillSelect={vi.fn()} />);

    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('renders correct number of SkillCard components', () => {
    const skills = [
      makeSkill({ name: 'shep-kit:plan', displayName: 'plan', category: 'Workflow' }),
      makeSkill({ name: 'shep-kit:implement', displayName: 'implement', category: 'Workflow' }),
      makeSkill({ name: 'shadcn-ui', displayName: 'shadcn-ui', category: 'Reference' }),
    ];
    render(<SkillList skills={skills} onSkillSelect={vi.fn()} />);

    expect(screen.getByTestId('skill-card-shep-kit:plan')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shep-kit:implement')).toBeInTheDocument();
    expect(screen.getByTestId('skill-card-shadcn-ui')).toBeInTheDocument();
  });

  it('passes onSkillSelect to cards', async () => {
    const user = userEvent.setup();
    const onSkillSelect = vi.fn();
    const skill = makeSkill({ name: 'my-skill', displayName: 'my-skill' });
    render(<SkillList skills={[skill]} onSkillSelect={onSkillSelect} />);

    await user.click(screen.getByTestId('skill-card-my-skill'));
    expect(onSkillSelect).toHaveBeenCalledOnce();
    expect(onSkillSelect).toHaveBeenCalledWith(skill);
  });

  it('renders categories in the correct order: Workflow, Code Generation, Analysis, Reference', () => {
    const skills = [
      makeSkill({ name: 'ref-skill', displayName: 'ref-skill', category: 'Reference' }),
      makeSkill({ name: 'reviewer', displayName: 'reviewer', category: 'Analysis' }),
      makeSkill({ name: 'shep:ui', displayName: 'ui', category: 'Code Generation' }),
      makeSkill({ name: 'shep-kit:plan', displayName: 'plan', category: 'Workflow' }),
    ];
    render(<SkillList skills={skills} onSkillSelect={vi.fn()} />);

    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings[0]).toHaveTextContent('Workflow');
    expect(headings[1]).toHaveTextContent('Code Generation');
    expect(headings[2]).toHaveTextContent('Analysis');
    expect(headings[3]).toHaveTextContent('Reference');
  });

  it('renders nothing when skills array is empty', () => {
    const { container } = render(<SkillList skills={[]} onSkillSelect={vi.fn()} />);
    expect(container.querySelectorAll('section')).toHaveLength(0);
  });
});

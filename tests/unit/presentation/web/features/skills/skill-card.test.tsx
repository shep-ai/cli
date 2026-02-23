import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillCard } from '@/components/features/skills/skill-card';
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

describe('SkillCard', () => {
  it('renders display name as card title', () => {
    render(<SkillCard skill={makeSkill()} onSelect={vi.fn()} />);
    expect(screen.getByText('implement')).toBeInTheDocument();
  });

  it('renders full skill name as muted subtitle', () => {
    render(<SkillCard skill={makeSkill()} onSelect={vi.fn()} />);
    expect(screen.getByText('shep-kit:implement')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<SkillCard skill={makeSkill()} onSelect={vi.fn()} />);
    expect(
      screen.getByText('Validate specs and autonomously execute implementation tasks')
    ).toBeInTheDocument();
  });

  it('renders source badge with "Project" for project skills', () => {
    render(<SkillCard skill={makeSkill({ source: 'project' })} onSelect={vi.fn()} />);
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('renders source badge with "Global" for global skills', () => {
    render(<SkillCard skill={makeSkill({ source: 'global' })} onSelect={vi.fn()} />);
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('renders context badge when context is provided', () => {
    render(<SkillCard skill={makeSkill({ context: 'fork' })} onSelect={vi.fn()} />);
    expect(screen.getByText('fork')).toBeInTheDocument();
  });

  it('does not render context badge when context is undefined', () => {
    render(<SkillCard skill={makeSkill({ context: undefined })} onSelect={vi.fn()} />);
    expect(screen.queryByText('fork')).not.toBeInTheDocument();
  });

  it('renders tools badge when allowedTools is provided', () => {
    render(
      <SkillCard skill={makeSkill({ allowedTools: 'Read, Write, Bash' })} onSelect={vi.fn()} />
    );
    expect(screen.getByText('Tools')).toBeInTheDocument();
  });

  it('does not render tools badge when allowedTools is undefined', () => {
    render(<SkillCard skill={makeSkill({ allowedTools: undefined })} onSelect={vi.fn()} />);
    expect(screen.queryByText('Tools')).not.toBeInTheDocument();
  });

  it('renders resource count when resources exist', () => {
    const skill = makeSkill({
      resources: [
        { name: 'references', fileCount: 7 },
        { name: 'templates', fileCount: 3 },
        { name: 'validation', fileCount: 1 },
      ],
    });
    render(<SkillCard skill={skill} onSelect={vi.fn()} />);
    expect(screen.getByText('3 resources')).toBeInTheDocument();
  });

  it('renders singular "resource" for single resource directory', () => {
    const skill = makeSkill({
      resources: [{ name: 'references', fileCount: 5 }],
    });
    render(<SkillCard skill={skill} onSelect={vi.fn()} />);
    expect(screen.getByText('1 resource')).toBeInTheDocument();
  });

  it('does not render resource count when resources array is empty', () => {
    render(<SkillCard skill={makeSkill({ resources: [] })} onSelect={vi.fn()} />);
    expect(screen.queryByText(/resource/)).not.toBeInTheDocument();
  });

  it('calls onSelect when card is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const skill = makeSkill();
    render(<SkillCard skill={skill} onSelect={onSelect} />);

    await user.click(screen.getByTestId('skill-card-shep-kit:implement'));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledWith(skill);
  });

  it('calls onSelect when Enter key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const skill = makeSkill();
    render(<SkillCard skill={skill} onSelect={onSelect} />);

    const card = screen.getByTestId('skill-card-shep-kit:implement');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('calls onSelect when Space key is pressed', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const skill = makeSkill();
    render(<SkillCard skill={skill} onSelect={onSelect} />);

    const card = screen.getByTestId('skill-card-shep-kit:implement');
    card.focus();
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('has role="button" for accessibility', () => {
    render(<SkillCard skill={makeSkill()} onSelect={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SkillDetailDrawer } from '@/components/features/skills/skill-detail-drawer';
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

describe('SkillDetailDrawer', () => {
  it('renders skill display name as sheet title when open', () => {
    render(<SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />);
    expect(screen.getByText('implement')).toBeInTheDocument();
  });

  it('renders full skill name as sheet description', () => {
    render(<SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />);
    expect(screen.getByText('shep-kit:implement')).toBeInTheDocument();
  });

  it('renders skill description', () => {
    render(<SkillDetailDrawer skill={makeSkill()} onClose={vi.fn()} />);
    expect(
      screen.getByText('Validate specs and autonomously execute implementation tasks')
    ).toBeInTheDocument();
  });

  it('renders source badge for project skills', () => {
    render(<SkillDetailDrawer skill={makeSkill({ source: 'project' })} onClose={vi.fn()} />);
    expect(screen.getByText('Project')).toBeInTheDocument();
  });

  it('renders source badge for global skills', () => {
    render(<SkillDetailDrawer skill={makeSkill({ source: 'global' })} onClose={vi.fn()} />);
    expect(screen.getByText('Global')).toBeInTheDocument();
  });

  it('renders context badge when context is provided', () => {
    render(<SkillDetailDrawer skill={makeSkill({ context: 'fork' })} onClose={vi.fn()} />);
    expect(screen.getByText('fork')).toBeInTheDocument();
  });

  it('does not render context badge when context is undefined', () => {
    render(<SkillDetailDrawer skill={makeSkill({ context: undefined })} onClose={vi.fn()} />);
    expect(screen.queryByText('fork')).not.toBeInTheDocument();
  });

  it('renders allowed-tools badge when allowedTools is provided', () => {
    render(
      <SkillDetailDrawer
        skill={makeSkill({ allowedTools: 'Read, Write, Bash' })}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText('Read, Write, Bash')).toBeInTheDocument();
  });

  it('does not render allowed-tools section when allowedTools is undefined', () => {
    render(<SkillDetailDrawer skill={makeSkill({ allowedTools: undefined })} onClose={vi.fn()} />);
    expect(screen.queryByText('Allowed Tools')).not.toBeInTheDocument();
  });

  it('renders resource list with file counts', () => {
    const skill = makeSkill({
      resources: [
        { name: 'references', fileCount: 7 },
        { name: 'templates', fileCount: 3 },
      ],
    });
    render(<SkillDetailDrawer skill={skill} onClose={vi.fn()} />);

    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText(/references\//)).toBeInTheDocument();
    expect(screen.getByText(/7 files/)).toBeInTheDocument();
    expect(screen.getByText(/templates\//)).toBeInTheDocument();
    expect(screen.getByText(/3 files/)).toBeInTheDocument();
  });

  it('renders singular "file" for single file count', () => {
    const skill = makeSkill({
      resources: [{ name: 'scripts', fileCount: 1 }],
    });
    render(<SkillDetailDrawer skill={skill} onClose={vi.fn()} />);
    expect(screen.getByText(/1 file$/)).toBeInTheDocument();
  });

  it('hides resource section when resources array is empty', () => {
    render(<SkillDetailDrawer skill={makeSkill({ resources: [] })} onClose={vi.fn()} />);
    expect(screen.queryByText('Resources')).not.toBeInTheDocument();
  });

  it('renders skill body text in a whitespace-preserving container', () => {
    render(
      <SkillDetailDrawer
        skill={makeSkill({ body: 'Line one\n  Line two\n    Line three' })}
        onClose={vi.fn()}
      />
    );
    const bodyElement = screen.getByText(/Line one/);
    expect(bodyElement).toBeInTheDocument();
    expect(bodyElement.tagName).toBe('PRE');
  });

  it('renders nothing when skill is null', () => {
    const { container } = render(<SkillDetailDrawer skill={null} onClose={vi.fn()} />);
    expect(container.querySelector('[data-slot="sheet-content"]')).not.toBeInTheDocument();
  });

  it('calls onClose when sheet is dismissed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SkillDetailDrawer skill={makeSkill()} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('renders category badge', () => {
    render(<SkillDetailDrawer skill={makeSkill({ category: 'Workflow' })} onClose={vi.fn()} />);
    expect(screen.getByText('Workflow')).toBeInTheDocument();
  });
});

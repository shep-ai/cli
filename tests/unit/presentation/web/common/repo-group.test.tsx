import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepoGroup } from '@/components/common/repo-group';

describe('RepoGroup', () => {
  it('renders repo name', () => {
    render(
      <RepoGroup repoName="my-project" featureCount={3}>
        <div>child</div>
      </RepoGroup>
    );

    expect(screen.getByText('my-project')).toBeInTheDocument();
  });

  it('shows feature count badge', () => {
    render(
      <RepoGroup repoName="my-project" featureCount={5}>
        <div>child</div>
      </RepoGroup>
    );

    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders children when expanded (default)', () => {
    render(
      <RepoGroup repoName="my-project" featureCount={2}>
        <div>Feature A</div>
        <div>Feature B</div>
      </RepoGroup>
    );

    expect(screen.getByText('Feature A')).toBeInTheDocument();
    expect(screen.getByText('Feature B')).toBeInTheDocument();
  });

  it('hides children when collapsed', async () => {
    const user = userEvent.setup();

    render(
      <RepoGroup repoName="my-project" featureCount={1}>
        <div>Feature A</div>
      </RepoGroup>
    );

    // Click to collapse
    await user.click(screen.getByRole('button', { name: /my-project/i }));

    expect(screen.queryByText('Feature A')).not.toBeInTheDocument();
  });

  it('toggles children visibility on click', async () => {
    const user = userEvent.setup();

    render(
      <RepoGroup repoName="my-project" featureCount={1}>
        <div>Feature A</div>
      </RepoGroup>
    );

    const toggle = screen.getByRole('button', { name: /my-project/i });

    // Collapse
    await user.click(toggle);
    expect(screen.queryByText('Feature A')).not.toBeInTheDocument();

    // Expand
    await user.click(toggle);
    expect(screen.getByText('Feature A')).toBeInTheDocument();
  });

  it('starts collapsed when defaultOpen is false', () => {
    render(
      <RepoGroup repoName="my-project" featureCount={1} defaultOpen={false}>
        <div>Feature A</div>
      </RepoGroup>
    );

    expect(screen.queryByText('Feature A')).not.toBeInTheDocument();
  });

  it('has correct aria-expanded attribute', async () => {
    const user = userEvent.setup();

    render(
      <RepoGroup repoName="my-project" featureCount={1}>
        <div>child</div>
      </RepoGroup>
    );

    const toggle = screen.getByRole('button', { name: /my-project/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });
});

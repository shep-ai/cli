import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GitHubUrlInput } from '@/components/common/github-import-dialog/github-url-input';

describe('GitHubUrlInput', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders input with placeholder', () => {
    render(<GitHubUrlInput {...defaultProps} />);
    expect(
      screen.getByPlaceholderText('owner/repo or https://github.com/owner/repo')
    ).toBeInTheDocument();
  });

  it('renders label', () => {
    render(<GitHubUrlInput {...defaultProps} />);
    expect(screen.getByLabelText('GitHub URL')).toBeInTheDocument();
  });

  it('calls onSubmit with valid GitHub URL (HTTPS)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'https://github.com/octocat/hello-world');
    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(onSubmit).toHaveBeenCalledWith('https://github.com/octocat/hello-world');
  });

  it('calls onSubmit with valid GitHub URL (shorthand)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'octocat/hello-world');
    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(onSubmit).toHaveBeenCalledWith('octocat/hello-world');
  });

  it('calls onSubmit with valid GitHub URL (SSH)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'git@github.com:octocat/hello-world.git');
    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(onSubmit).toHaveBeenCalledWith('git@github.com:octocat/hello-world.git');
  });

  it('shows error for invalid URL format', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'not-a-valid-url');
    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(screen.getByRole('alert')).toHaveTextContent(/enter a valid github url/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows error for empty input on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    // Focus the input, type something, clear it, then click import
    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'x');
    await user.clear(input);
    // Button is disabled when empty, so use Enter key
    await user.type(input, '{Enter}');

    expect(screen.getByRole('alert')).toHaveTextContent(/please enter a github url/i);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits on Enter key press', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GitHubUrlInput onSubmit={onSubmit} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'octocat/repo{Enter}');

    expect(onSubmit).toHaveBeenCalledWith('octocat/repo');
  });

  it('disables input when loading', () => {
    render(<GitHubUrlInput onSubmit={vi.fn()} loading />);
    expect(screen.getByLabelText('GitHub URL')).toBeDisabled();
  });

  it('clears error when user types', async () => {
    const user = userEvent.setup();
    render(<GitHubUrlInput onSubmit={vi.fn()} />);

    const input = screen.getByLabelText('GitHub URL');
    await user.type(input, 'bad');
    await user.click(screen.getByRole('button', { name: /import/i }));

    expect(screen.getByRole('alert')).toBeInTheDocument();

    await user.type(input, 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

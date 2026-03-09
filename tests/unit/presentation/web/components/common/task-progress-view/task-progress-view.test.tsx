import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskProgressView } from '@/components/common/task-progress-view';
import type { PlanTaskData } from '@/app/actions/get-feature-plan';

const tasksFixture: PlanTaskData[] = [
  {
    title: 'Set up auth middleware',
    description: 'Create Express middleware for JWT verification',
    state: 'Done',
    actionItems: [
      {
        name: 'Create middleware function',
        description: 'JWT verification middleware',
        acceptanceCriteria: [
          { description: 'Verifies JWT tokens', verified: true },
          { description: 'Returns 401 on invalid token', verified: true },
        ],
      },
    ],
  },
  {
    title: 'Implement token refresh',
    description: 'Handle refresh token rotation',
    state: 'Work in Progress',
    actionItems: [
      {
        name: 'Implement rotation logic',
        description: 'Rotate refresh tokens on use',
        acceptanceCriteria: [
          { description: 'Old token is invalidated', verified: true },
          { description: 'New token is issued', verified: false },
        ],
      },
    ],
  },
  {
    title: 'Write integration tests',
    description: 'Test all auth flows end-to-end',
    state: 'Todo',
    actionItems: [],
  },
];

describe('TaskProgressView', () => {
  describe('empty state', () => {
    it('renders empty message when no tasks', () => {
      render(<TaskProgressView tasks={[]} />);
      expect(screen.getByText('No tasks defined yet')).toBeInTheDocument();
    });

    it('does not render progress summary when empty', () => {
      render(<TaskProgressView tasks={[]} />);
      expect(screen.queryByTestId('task-progress-summary')).not.toBeInTheDocument();
    });
  });

  describe('progress summary', () => {
    it('renders progress summary with correct counts', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      expect(screen.getByTestId('task-progress-summary')).toBeInTheDocument();
      expect(screen.getByText('1 of 3 done')).toBeInTheDocument();
    });

    it('renders progress bar', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      const bar = screen.getByTestId('task-progress-bar');
      expect(bar).toBeInTheDocument();
      expect(bar).toHaveStyle({ width: '33%' });
    });

    it('shows stat chips for present states', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      expect(screen.getByText('1 Done')).toBeInTheDocument();
      expect(screen.getByText('1 In Progress')).toBeInTheDocument();
      expect(screen.getByText('1 Todo')).toBeInTheDocument();
    });
  });

  describe('task cards', () => {
    it('renders all task cards', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      const cards = screen.getAllByTestId(/^task-card-/);
      expect(cards).toHaveLength(3);
    });

    it('renders task titles', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      expect(screen.getByText('Set up auth middleware')).toBeInTheDocument();
      expect(screen.getByText('Implement token refresh')).toBeInTheDocument();
      expect(screen.getByText('Write integration tests')).toBeInTheDocument();
    });

    it('renders task descriptions', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      expect(
        screen.getByText('Create Express middleware for JWT verification')
      ).toBeInTheDocument();
    });
  });

  describe('expandable task cards', () => {
    it('does not show action items by default', () => {
      render(<TaskProgressView tasks={tasksFixture} />);
      expect(screen.queryByTestId('action-item')).not.toBeInTheDocument();
    });

    it('expands task card to show action items when clicked', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Set up auth middleware'));
      expect(screen.getByText('Create middleware function')).toBeInTheDocument();
    });

    it('shows acceptance criteria when task is expanded', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Set up auth middleware'));
      expect(screen.getByText('Verifies JWT tokens')).toBeInTheDocument();
      expect(screen.getByText('Returns 401 on invalid token')).toBeInTheDocument();
    });

    it('shows acceptance criteria count', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Set up auth middleware'));
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });

    it('collapses expanded task on second click', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Set up auth middleware'));
      expect(screen.getByText('Create middleware function')).toBeInTheDocument();

      await user.click(screen.getByText('Set up auth middleware'));
      expect(screen.queryByText('Create middleware function')).not.toBeInTheDocument();
    });

    it('does not expand task card without action items', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Write integration tests'));
      expect(screen.queryByTestId('action-item')).not.toBeInTheDocument();
    });
  });

  describe('acceptance criteria display', () => {
    it('shows verified criteria with strikethrough', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Implement token refresh'));
      const verifiedCriterion = screen.getByText('Old token is invalidated');
      expect(verifiedCriterion).toHaveClass('line-through');
    });

    it('shows unverified criteria without strikethrough', async () => {
      const user = userEvent.setup();
      render(<TaskProgressView tasks={tasksFixture} />);

      await user.click(screen.getByText('Implement token refresh'));
      const unverifiedCriterion = screen.getByText('New token is issued');
      expect(unverifiedCriterion).not.toHaveClass('line-through');
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanTab } from '@/components/common/feature-drawer-tabs/plan-tab';
import type { PlanData } from '@/app/actions/get-feature-plan';

const mockPlan: PlanData = {
  state: 'Ready',
  overview: 'Implement OAuth2 authentication with JWT tokens and session management.',
  tasks: [
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
      title: 'Build login endpoint',
      description: 'POST /auth/login with email/password',
      state: 'Done',
      actionItems: [],
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
      title: 'Add session management',
      description: 'Track active sessions per user',
      state: 'Review',
      actionItems: [],
    },
    {
      title: 'Write integration tests',
      description: 'Test all auth flows end-to-end',
      state: 'Todo',
      actionItems: [],
    },
  ],
};

describe('PlanTab', () => {
  describe('loading state', () => {
    it('renders loading spinner when loading is true', () => {
      render(<PlanTab plan={null} loading={true} error={null} />);
      expect(screen.getByTestId('plan-tab-loading')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when plan is undefined/null', () => {
      render(<PlanTab plan={null} loading={false} error={null} />);
      expect(screen.getByText('No plan created yet')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders inline error message when error is provided', () => {
      render(<PlanTab plan={null} loading={false} error="Failed to load plan data" />);
      expect(screen.getByText('Failed to load plan data')).toBeInTheDocument();
    });
  });

  describe('plan state badge', () => {
    it('renders plan state as a badge', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });

    it('renders Requirements state badge', () => {
      render(
        <PlanTab plan={{ ...mockPlan, state: 'Requirements' }} loading={false} error={null} />
      );
      expect(screen.getByText('Requirements')).toBeInTheDocument();
    });

    it('renders ClarificationRequired state badge', () => {
      render(
        <PlanTab
          plan={{ ...mockPlan, state: 'ClarificationRequired' }}
          loading={false}
          error={null}
        />
      );
      expect(screen.getByText('ClarificationRequired')).toBeInTheDocument();
    });
  });

  describe('plan overview', () => {
    it('renders plan overview text', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(
        screen.getByText('Implement OAuth2 authentication with JWT tokens and session management.')
      ).toBeInTheDocument();
    });
  });

  describe('task progress view', () => {
    it('renders all tasks with their titles', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(screen.getByText('Set up auth middleware')).toBeInTheDocument();
      expect(screen.getByText('Build login endpoint')).toBeInTheDocument();
      expect(screen.getByText('Implement token refresh')).toBeInTheDocument();
      expect(screen.getByText('Add session management')).toBeInTheDocument();
      expect(screen.getByText('Write integration tests')).toBeInTheDocument();
    });

    it('renders task descriptions', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(
        screen.getByText('Create Express middleware for JWT verification')
      ).toBeInTheDocument();
      expect(screen.getByText('POST /auth/login with email/password')).toBeInTheDocument();
    });

    it('renders the task progress list', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(screen.getByTestId('task-progress-list')).toBeInTheDocument();
    });

    it('renders task cards with correct testids', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const taskCards = screen.getAllByTestId(/^task-card-/);
      expect(taskCards.length).toBe(5);
    });

    it('renders progress summary', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      expect(screen.getByTestId('task-progress-summary')).toBeInTheDocument();
      expect(screen.getByText('2 of 5 done')).toBeInTheDocument();
    });

    it('renders empty task list message when plan has no tasks', () => {
      render(<PlanTab plan={{ ...mockPlan, tasks: [] }} loading={false} error={null} />);
      expect(screen.getByText('No tasks defined yet')).toBeInTheDocument();
    });
  });
});

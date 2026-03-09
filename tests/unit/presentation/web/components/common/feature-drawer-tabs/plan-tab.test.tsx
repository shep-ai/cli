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
    },
    {
      title: 'Build login endpoint',
      description: 'POST /auth/login with email/password',
      state: 'Done',
    },
    {
      title: 'Implement token refresh',
      description: 'Handle refresh token rotation',
      state: 'Work in Progress',
    },
    {
      title: 'Add session management',
      description: 'Track active sessions per user',
      state: 'Review',
    },
    {
      title: 'Write integration tests',
      description: 'Test all auth flows end-to-end',
      state: 'Todo',
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

  describe('task list', () => {
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

    it('renders correct status icons for each task state', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const taskList = screen.getByTestId('plan-task-list');
      expect(taskList).toBeInTheDocument();
      const taskItems = screen.getAllByTestId(/^plan-task-/);
      expect(taskItems.length).toBeGreaterThanOrEqual(5);
    });

    it('applies correct color class for Done task state', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const doneTask = screen.getByTestId('plan-task-0');
      expect(doneTask).toHaveClass('text-emerald-600');
    });

    it('applies correct color class for WIP task state', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const wipTask = screen.getByTestId('plan-task-2');
      expect(wipTask).toHaveClass('text-blue-600');
    });

    it('applies correct color class for Review task state', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const reviewTask = screen.getByTestId('plan-task-3');
      expect(reviewTask).toHaveClass('text-amber-600');
    });

    it('applies correct color class for Todo task state', () => {
      render(<PlanTab plan={mockPlan} loading={false} error={null} />);
      const todoTask = screen.getByTestId('plan-task-4');
      expect(todoTask).toHaveClass('text-muted-foreground');
    });

    it('renders empty task list message when plan has no tasks', () => {
      render(<PlanTab plan={{ ...mockPlan, tasks: [] }} loading={false} error={null} />);
      expect(screen.getByText('No tasks defined yet')).toBeInTheDocument();
    });
  });
});

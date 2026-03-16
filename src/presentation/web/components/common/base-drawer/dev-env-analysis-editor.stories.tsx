import type { Meta, StoryObj } from '@storybook/react';
import { AnalysisSource } from '@shepai/core/domain/generated/output';
import { DevEnvAnalysisEditor } from './dev-env-analysis-editor';

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() {}

const meta: Meta<typeof DevEnvAnalysisEditor> = {
  title: 'Common/DevEnvAnalysisEditor',
  component: DevEnvAnalysisEditor,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DevEnvAnalysisEditor>;

const baseAnalysis = {
  id: 'test-id',
  cacheKey: 'git@github.com:org/repo.git',
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Node.js project with fast-path analysis. */
export const NodeProject: Story = {
  args: {
    analysis: {
      ...baseAnalysis,
      canStart: true,
      commands: [{ command: 'npm run dev', description: 'Start Next.js dev server' }],
      ports: [3000],
      language: 'TypeScript',
      framework: 'Next.js',
      source: AnalysisSource.FastPath,
    },
    onSave: noop,
    onCancel: noop,
  },
};

/** Python project with multiple commands, prerequisites, and env vars. */
export const PythonProject: Story = {
  args: {
    analysis: {
      ...baseAnalysis,
      canStart: true,
      commands: [
        {
          command: 'python manage.py migrate',
          description: 'Run database migrations',
        },
        {
          command: 'python manage.py runserver 0.0.0.0:8000',
          description: 'Start Django dev server',
        },
      ],
      ports: [8000],
      prerequisites: ['Python 3.10+', 'PostgreSQL'],
      environmentVariables: { DATABASE_URL: 'postgres://localhost/mydb', DEBUG: 'true' },
      language: 'Python',
      framework: 'Django',
      source: AnalysisSource.Agent,
    },
    onSave: noop,
    onCancel: noop,
  },
};

/** Not startable project — canStart toggled off with reason. */
export const NotStartable: Story = {
  args: {
    analysis: {
      ...baseAnalysis,
      canStart: false,
      reason: 'This is a CLI utility with no server or UI component',
      commands: [],
      language: 'Rust',
      source: AnalysisSource.Agent,
    },
    onSave: noop,
    onCancel: noop,
  },
};

/** Empty analysis — minimal fields for a fresh manual configuration. */
export const EmptyAnalysis: Story = {
  args: {
    analysis: {
      ...baseAnalysis,
      canStart: true,
      commands: [],
      language: '',
      source: AnalysisSource.Manual,
    },
    onSave: noop,
    onCancel: noop,
  },
};

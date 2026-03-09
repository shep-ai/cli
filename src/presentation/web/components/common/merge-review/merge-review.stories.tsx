import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { MergeReview } from './merge-review';
import type { MergeReviewData, MergeReviewFileDiff } from './merge-review-config';

const fullPr = {
  url: 'https://github.com/shep-ai/cli/pull/42',
  number: 42,
  status: PrStatus.Open,
  commitHash: 'a1b2c3d4e5f6789',
  ciStatus: CiStatus.Success,
} as const;

const samplePhases = [
  { id: 'phase-1', name: 'Foundation & Config', description: 'Set up types and server action' },
  { id: 'phase-2', name: 'Component Implementation', description: 'Build the merge review UI' },
  { id: 'phase-3', name: 'Integration & Wiring', description: 'Connect to control center' },
];

const sampleBranch = { source: 'feat/add-auth', target: 'main' };

const sampleFileDiffs: MergeReviewFileDiff[] = [
  {
    path: 'src/components/auth/login-form.tsx',
    additions: 8,
    deletions: 2,
    status: 'modified',
    hunks: [
      {
        header: '@@ -1,5 +1,8 @@',
        lines: [
          {
            type: 'context',
            content: "import { useState } from 'react';",
            oldNumber: 1,
            newNumber: 1,
          },
          {
            type: 'added',
            content: "import { Input } from '@/components/ui/input';",
            newNumber: 2,
          },
          { type: 'context', content: '', oldNumber: 2, newNumber: 3 },
          { type: 'removed', content: 'export function LoginForm() {', oldNumber: 3 },
          {
            type: 'added',
            content: 'export function LoginForm({ onSubmit }: Props) {',
            newNumber: 4,
          },
          {
            type: 'context',
            content: "  const [email, setEmail] = useState('');",
            oldNumber: 4,
            newNumber: 5,
          },
        ],
      },
    ],
  },
  {
    path: 'src/lib/auth.ts',
    additions: 12,
    deletions: 0,
    status: 'added',
    hunks: [
      {
        header: '@@ -0,0 +1,4 @@',
        lines: [
          {
            type: 'added',
            content: 'export async function hashPassword(pw: string) {',
            newNumber: 1,
          },
          { type: 'added', content: '  return hash(pw, 10);', newNumber: 2 },
          { type: 'added', content: '}', newNumber: 3 },
        ],
      },
    ],
  },
];

const fullData: MergeReviewData = {
  pr: fullPr,
  branch: sampleBranch,
  phases: samplePhases,
  diffSummary: {
    filesChanged: 12,
    additions: 340,
    deletions: 85,
    commitCount: 5,
  },
};

const defaultActions = {
  onApprove: fn().mockName('onApprove'),
  onReject: fn().mockName('onReject'),
};

/* ─── Standalone MergeReview ─── */

const meta: Meta<typeof MergeReview> = {
  title: 'Drawers/Review/MergeReview',
  component: MergeReview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MergeReview>;

/** Default — all data present with CI success. */
export const Default: Story = {
  args: {
    data: fullData,
    ...defaultActions,
  },
};

/** CI status is Pending — shows yellow badge with spinner. */
export const CIPending: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: CiStatus.Pending },
    },
    ...defaultActions,
  },
};

/** CI status is Failure — shows red badge. */
export const CIFailure: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: CiStatus.Failure },
    },
    ...defaultActions,
  },
};

/** Diff summary unavailable — shows warning message. */
export const NoDiffSummary: Story = {
  args: {
    data: {
      pr: fullPr,
      branch: sampleBranch,
      warning: 'Diff statistics unavailable — worktree may have been removed',
    },
    ...defaultActions,
  },
};

/** CI status undefined — CI section omitted entirely. */
export const NoCIStatus: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: undefined },
    },
    ...defaultActions,
  },
};

/** Processing state — approve button disabled with spinner. */
export const Processing: Story = {
  args: {
    data: fullData,
    ...defaultActions,
    isProcessing: true,
  },
};

/** No PR — merge without a pull request, shows branch direction and diff summary. */
export const NoPrWithDiff: Story = {
  args: {
    data: {
      branch: { source: 'feat/fix-login', target: 'main' },
      phases: samplePhases,
      diffSummary: fullData.diffSummary,
    },
    ...defaultActions,
  },
};

/** No PR and no diff — bare merge approval with branch info. */
export const NoPrNoDiff: Story = {
  args: {
    data: {
      branch: { source: 'feat/fix-login', target: 'main' },
      warning: 'No PR or diff data available',
    },
    ...defaultActions,
  },
};

/** With implementation phases shown. */
export const WithPhases: Story = {
  args: {
    data: {
      ...fullData,
      phases: samplePhases,
    },
    ...defaultActions,
  },
};

/** With file diffs — shows expandable file list with line-level changes. */
export const WithFileDiffs: Story = {
  args: {
    data: {
      ...fullData,
      fileDiffs: sampleFileDiffs,
    },
    ...defaultActions,
  },
};

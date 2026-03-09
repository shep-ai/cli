import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffView } from '@/components/common/merge-review/diff-view';
import type { MergeReviewFileDiff } from '@/components/common/merge-review/merge-review-config';

const modifiedFile: MergeReviewFileDiff = {
  path: 'src/components/login.tsx',
  additions: 5,
  deletions: 2,
  status: 'modified',
  hunks: [
    {
      header: '@@ -1,4 +1,7 @@',
      lines: [
        { type: 'context', content: "import React from 'react';", oldNumber: 1, newNumber: 1 },
        { type: 'removed', content: 'function Login() {', oldNumber: 2 },
        { type: 'added', content: 'function Login({ onSubmit }: Props) {', newNumber: 2 },
        { type: 'context', content: '  return <div />;', oldNumber: 3, newNumber: 3 },
      ],
    },
  ],
};

const addedFile: MergeReviewFileDiff = {
  path: 'src/lib/auth.ts',
  additions: 10,
  deletions: 0,
  status: 'added',
  hunks: [
    {
      header: '@@ -0,0 +1,3 @@',
      lines: [
        { type: 'added', content: 'export function hash() {', newNumber: 1 },
        { type: 'added', content: '  return "hashed";', newNumber: 2 },
        { type: 'added', content: '}', newNumber: 3 },
      ],
    },
  ],
};

const deletedFile: MergeReviewFileDiff = {
  path: 'src/old-utils.ts',
  additions: 0,
  deletions: 5,
  status: 'deleted',
  hunks: [
    {
      header: '@@ -1,2 +0,0 @@',
      lines: [
        { type: 'removed', content: 'export const old = true;', oldNumber: 1 },
        { type: 'removed', content: '', oldNumber: 2 },
      ],
    },
  ],
};

const renamedFile: MergeReviewFileDiff = {
  path: 'src/services/user-service.ts',
  oldPath: 'src/services/user.ts',
  additions: 1,
  deletions: 0,
  status: 'renamed',
  hunks: [],
};

describe('DiffView', () => {
  describe('rendering', () => {
    it('renders nothing when fileDiffs is empty', () => {
      const { container } = render(<DiffView fileDiffs={[]} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders "Changed Files" header with file count', () => {
      render(<DiffView fileDiffs={[modifiedFile, addedFile]} />);

      expect(screen.getByText('Changed Files')).toBeInTheDocument();
      expect(screen.getByText('(2)')).toBeInTheDocument();
    });

    it('renders file names for each file diff', () => {
      render(<DiffView fileDiffs={[modifiedFile, addedFile, deletedFile]} />);

      expect(screen.getByText('login.tsx')).toBeInTheDocument();
      expect(screen.getByText('auth.ts')).toBeInTheDocument();
      expect(screen.getByText('old-utils.ts')).toBeInTheDocument();
    });

    it('shows directory path in muted style before file name', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      expect(screen.getByText('src/components/')).toBeInTheDocument();
    });

    it('displays addition and deletion counts per file', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      expect(screen.getByText('+5')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('shows only additions for added files', () => {
      render(<DiffView fileDiffs={[addedFile]} />);

      expect(screen.getByText('+10')).toBeInTheDocument();
      expect(screen.queryByText('-0')).not.toBeInTheDocument();
    });

    it('shows only deletions for deleted files', () => {
      render(<DiffView fileDiffs={[deletedFile]} />);

      expect(screen.getByText('-5')).toBeInTheDocument();
      expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });
  });

  describe('expanding files', () => {
    it('does not show hunk content by default', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      expect(screen.queryByText('@@ -1,4 +1,7 @@')).not.toBeInTheDocument();
    });

    it('shows hunk content when file row is clicked', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      fireEvent.click(screen.getByText('login.tsx'));

      expect(screen.getByText('@@ -1,4 +1,7 @@')).toBeInTheDocument();
      expect(screen.getByText("import React from 'react';")).toBeInTheDocument();
      expect(screen.getByText('function Login() {')).toBeInTheDocument();
      expect(screen.getByText('function Login({ onSubmit }: Props) {')).toBeInTheDocument();
    });

    it('hides hunk content when file row is clicked again', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      fireEvent.click(screen.getByText('login.tsx'));
      expect(screen.getByText('@@ -1,4 +1,7 @@')).toBeInTheDocument();

      fireEvent.click(screen.getByText('login.tsx'));
      expect(screen.queryByText('@@ -1,4 +1,7 @@')).not.toBeInTheDocument();
    });

    it('shows diff line content after expanding', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);
      fireEvent.click(screen.getByText('login.tsx'));

      // Added and removed lines are visible
      expect(screen.getByText("import React from 'react';")).toBeInTheDocument();
      expect(screen.getByText('function Login() {')).toBeInTheDocument();
      expect(screen.getByText('function Login({ onSubmit }: Props) {')).toBeInTheDocument();
    });

    it('does not expand file with no hunks', () => {
      render(<DiffView fileDiffs={[renamedFile]} />);

      fireEvent.click(screen.getByText('user-service.ts'));
      // No hunk header should appear since hunks are empty
      expect(screen.queryByText(/@@ /)).not.toBeInTheDocument();
    });
  });

  describe('renamed files', () => {
    it('shows old file name indicator for renamed files', () => {
      render(<DiffView fileDiffs={[renamedFile]} />);

      expect(screen.getByText('user-service.ts')).toBeInTheDocument();
      // Shows the old filename with arrow indicator (← user.ts)
      expect(screen.getByText(/← user\.ts/)).toBeInTheDocument();
    });
  });
});

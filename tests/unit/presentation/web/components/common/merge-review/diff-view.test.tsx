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

      // File names appear in both tree and diff card, so use getAllByText
      expect(screen.getAllByText('login.tsx').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('auth.ts').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('old-utils.ts').length).toBeGreaterThanOrEqual(1);
    });

    it('shows directory path in muted style before file name', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      expect(screen.getByText('src/components/')).toBeInTheDocument();
    });

    it('displays addition and deletion counts per file', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      // Stats appear in both tree and diff card
      expect(screen.getAllByText('+5').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('-2').length).toBeGreaterThanOrEqual(1);
    });

    it('shows only additions for added files', () => {
      render(<DiffView fileDiffs={[addedFile]} />);

      expect(screen.getAllByText('+10').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('-0')).not.toBeInTheDocument();
    });

    it('shows only deletions for deleted files', () => {
      render(<DiffView fileDiffs={[deletedFile]} />);

      expect(screen.getAllByText('-5').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('+0')).not.toBeInTheDocument();
    });
  });

  describe('expanding files', () => {
    it('does not show hunk content by default', () => {
      const { container } = render(<DiffView fileDiffs={[modifiedFile]} />);

      expect(container.textContent).not.toContain('@@ -1,4 +1,7 @@');
    });

    it('shows hunk content when file row is clicked', () => {
      const { container } = render(<DiffView fileDiffs={[modifiedFile]} />);

      // Click the diff card button (not the tree file), which is the one with
      // directory path — find the button that has the directory path sibling
      const diffCardButtons = screen.getAllByRole('button');
      const expandButton = diffCardButtons.find(
        (btn) =>
          btn.textContent?.includes('src/components/') && btn.textContent?.includes('login.tsx')
      )!;
      fireEvent.click(expandButton);

      const text = container.textContent ?? '';
      expect(text).toContain('@@ -1,4 +1,7 @@');
      expect(text).toContain('import React');
      expect(text).toContain('function Login()');
      expect(text).toContain('function Login({ onSubmit }');
    });

    it('hides hunk content when file row is clicked again', () => {
      const { container } = render(<DiffView fileDiffs={[modifiedFile]} />);

      const diffCardButtons = screen.getAllByRole('button');
      const expandButton = diffCardButtons.find(
        (btn) =>
          btn.textContent?.includes('src/components/') && btn.textContent?.includes('login.tsx')
      )!;

      fireEvent.click(expandButton);
      expect(container.textContent).toContain('@@ -1,4 +1,7 @@');

      fireEvent.click(expandButton);
      expect(container.textContent).not.toContain('@@ -1,4 +1,7 @@');
    });

    it('shows diff line content after expanding', () => {
      const { container } = render(<DiffView fileDiffs={[modifiedFile]} />);

      const diffCardButtons = screen.getAllByRole('button');
      const expandButton = diffCardButtons.find(
        (btn) =>
          btn.textContent?.includes('src/components/') && btn.textContent?.includes('login.tsx')
      )!;
      fireEvent.click(expandButton);

      const text = container.textContent ?? '';
      expect(text).toContain('import React');
      expect(text).toContain('function Login()');
      expect(text).toContain('function Login({ onSubmit }');
    });

    it('does not expand file with no hunks', () => {
      const { container } = render(<DiffView fileDiffs={[renamedFile]} />);

      const diffCardButtons = screen.getAllByRole('button');
      const expandButton = diffCardButtons.find(
        (btn) =>
          btn.textContent?.includes('user-service.ts') && btn.textContent?.includes('src/services/')
      )!;
      fireEvent.click(expandButton);

      // No hunk header should appear since hunks are empty
      expect(container.textContent).not.toMatch(/@@ /);
    });
  });

  describe('renamed files', () => {
    it('shows old file name indicator for renamed files', () => {
      render(<DiffView fileDiffs={[renamedFile]} />);

      expect(screen.getAllByText('user-service.ts').length).toBeGreaterThanOrEqual(1);
      // Shows the old filename with arrow indicator (← user.ts)
      expect(screen.getByText(/← user\.ts/)).toBeInTheDocument();
    });
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffView, buildFileTree } from '@/components/common/merge-review/diff-view';
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

describe('buildFileTree', () => {
  it('creates a flat tree for root-level files', () => {
    const files: MergeReviewFileDiff[] = [
      { path: 'package.json', additions: 1, deletions: 0, status: 'modified', hunks: [] },
      { path: 'README.md', additions: 2, deletions: 1, status: 'modified', hunks: [] },
    ];
    const tree = buildFileTree(files);
    expect(tree).toHaveLength(2);
    expect(tree[0].type).toBe('file');
    expect(tree[0].name).toBe('package.json');
    expect(tree[1].type).toBe('file');
    expect(tree[1].name).toBe('README.md');
  });

  it('groups files into folder hierarchy', () => {
    const files: MergeReviewFileDiff[] = [
      { path: 'src/a.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
      { path: 'src/b.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
    ];
    const tree = buildFileTree(files);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('src');
    expect(tree[0].type).toBe('folder');
    expect(tree[0].children).toHaveLength(2);
  });

  it('collapses single-child folders', () => {
    const files: MergeReviewFileDiff[] = [
      { path: 'a/b/c/file.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
    ];
    const tree = buildFileTree(files);
    // a/b/c should collapse into a single node
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('a/b/c');
    expect(tree[0].type).toBe('folder');
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children![0].name).toBe('file.ts');
  });

  it('does not collapse folders with multiple children', () => {
    const files: MergeReviewFileDiff[] = [
      { path: 'src/a.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
      { path: 'src/b.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
    ];
    const tree = buildFileTree(files);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('src');
    expect(tree[0].children).toHaveLength(2);
  });

  it('handles mixed root and nested files', () => {
    const files: MergeReviewFileDiff[] = [
      { path: 'package.json', additions: 1, deletions: 0, status: 'modified', hunks: [] },
      { path: 'src/index.ts', additions: 1, deletions: 0, status: 'added', hunks: [] },
    ];
    const tree = buildFileTree(files);
    expect(tree).toHaveLength(2);
    const rootFile = tree.find((el) => el.name === 'package.json');
    const folder = tree.find((el) => el.name === 'src');
    expect(rootFile?.type).toBe('file');
    expect(folder?.type).toBe('folder');
  });
});

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

    it('renders file names for each file diff in the tree', () => {
      render(<DiffView fileDiffs={[modifiedFile, addedFile, deletedFile]} />);

      expect(screen.getByText('login.tsx')).toBeInTheDocument();
      expect(screen.getByText('auth.ts')).toBeInTheDocument();
      expect(screen.getByText('old-utils.ts')).toBeInTheDocument();
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

    it('shows hunk content when file is clicked', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      fireEvent.click(screen.getByText('login.tsx'));

      expect(screen.getByText('@@ -1,4 +1,7 @@')).toBeInTheDocument();
      expect(screen.getByText("import React from 'react';")).toBeInTheDocument();
      expect(screen.getByText('function Login() {')).toBeInTheDocument();
      expect(screen.getByText('function Login({ onSubmit }: Props) {')).toBeInTheDocument();
    });

    it('hides hunk content when file is clicked again', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);

      fireEvent.click(screen.getByText('login.tsx'));
      expect(screen.getByText('@@ -1,4 +1,7 @@')).toBeInTheDocument();

      fireEvent.click(screen.getByText('login.tsx'));
      expect(screen.queryByText('@@ -1,4 +1,7 @@')).not.toBeInTheDocument();
    });

    it('shows diff line content after expanding', () => {
      render(<DiffView fileDiffs={[modifiedFile]} />);
      fireEvent.click(screen.getByText('login.tsx'));

      expect(screen.getByText("import React from 'react';")).toBeInTheDocument();
      expect(screen.getByText('function Login() {')).toBeInTheDocument();
      expect(screen.getByText('function Login({ onSubmit }: Props) {')).toBeInTheDocument();
    });

    it('does not show hunk pane for file with no hunks', () => {
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
      expect(screen.getByText(/← user\.ts/)).toBeInTheDocument();
    });
  });

  describe('tree structure', () => {
    it('renders folder nodes for shared directories', () => {
      render(<DiffView fileDiffs={[modifiedFile, addedFile]} />);

      // src folder should exist (as a collapsed parent or split)
      expect(screen.getByText('login.tsx')).toBeInTheDocument();
      expect(screen.getByText('auth.ts')).toBeInTheDocument();
    });

    it('switches selected file when a different file is clicked', () => {
      render(<DiffView fileDiffs={[modifiedFile, addedFile]} />);

      // Click first file
      fireEvent.click(screen.getByText('login.tsx'));
      expect(screen.getByText('@@ -1,4 +1,7 @@')).toBeInTheDocument();

      // Click second file
      fireEvent.click(screen.getByText('auth.ts'));
      expect(screen.queryByText('@@ -1,4 +1,7 @@')).not.toBeInTheDocument();
      expect(screen.getByText('@@ -0,0 +1,3 @@')).toBeInTheDocument();
    });
  });
});

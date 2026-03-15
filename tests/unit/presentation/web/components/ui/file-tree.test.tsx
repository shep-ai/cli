import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Tree,
  Folder,
  File,
  CollapseButton,
  type TreeViewElement,
} from '@/components/ui/file-tree';

const sampleElements: TreeViewElement[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      { id: 'src/index.ts', name: 'index.ts' },
      {
        id: 'src/lib',
        name: 'lib',
        children: [{ id: 'src/lib/utils.ts', name: 'utils.ts' }],
      },
    ],
  },
  { id: 'package.json', name: 'package.json' },
];

const allIds = ['src', 'src/index.ts', 'src/lib', 'src/lib/utils.ts', 'package.json'];

describe('FileTree', () => {
  describe('Tree with elements prop', () => {
    it('renders tree elements automatically', () => {
      render(<Tree elements={sampleElements} initialExpandedItems={allIds} />);

      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('index.ts')).toBeInTheDocument();
      expect(screen.getByText('lib')).toBeInTheDocument();
      expect(screen.getByText('utils.ts')).toBeInTheDocument();
      expect(screen.getByText('package.json')).toBeInTheDocument();
    });

    it('sorts folders before files by default', () => {
      render(<Tree elements={sampleElements} initialExpandedItems={allIds} />);

      // Both src (folder) and package.json (file) should be rendered
      expect(screen.getByText('src')).toBeInTheDocument();
      expect(screen.getByText('package.json')).toBeInTheDocument();
    });
  });

  describe('Tree with custom children', () => {
    it('renders custom children', () => {
      render(
        <Tree initialExpandedItems={['root']} elements={sampleElements}>
          <Folder element="root-folder" value="root">
            <File value="file1">
              <span>custom-file.ts</span>
            </File>
          </Folder>
        </Tree>
      );

      expect(screen.getByText('root-folder')).toBeInTheDocument();
      expect(screen.getByText('custom-file.ts')).toBeInTheDocument();
    });
  });

  describe('File selection', () => {
    it('calls onSelect when a file is clicked', () => {
      const onSelect = vi.fn();
      render(
        <Tree elements={sampleElements} initialExpandedItems={allIds} onSelect={onSelect}>
          <File value="test-file">
            <span>test.ts</span>
          </File>
        </Tree>
      );

      fireEvent.click(screen.getByText('test.ts'));
      expect(onSelect).toHaveBeenCalledWith('test-file');
    });
  });

  describe('CollapseButton', () => {
    it('renders toggle button', () => {
      render(
        <Tree elements={sampleElements} initialExpandedItems={allIds}>
          <File value="src/index.ts">
            <span>index.ts</span>
          </File>
          <CollapseButton elements={sampleElements} />
        </Tree>
      );

      expect(screen.getByRole('button', { name: /toggle/i })).toBeInTheDocument();
    });
  });

  describe('custom file icons', () => {
    it('renders custom fileIcon on File', () => {
      render(
        <Tree elements={sampleElements} initialExpandedItems={allIds}>
          <File value="f" fileIcon={<span data-testid="custom-icon">icon</span>}>
            <span>file.ts</span>
          </File>
        </Tree>
      );

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });
});

import type { Meta, StoryObj } from '@storybook/react';
import { File, Folder, Tree, CollapseButton, type TreeViewElement } from './file-tree';
import { FilePlus, FileEdit, FileMinus } from 'lucide-react';

const sampleElements: TreeViewElement[] = [
  {
    id: 'src',
    name: 'src',
    children: [
      {
        id: 'src/components',
        name: 'components',
        children: [
          { id: 'src/components/button.tsx', name: 'button.tsx' },
          { id: 'src/components/input.tsx', name: 'input.tsx' },
          { id: 'src/components/dialog.tsx', name: 'dialog.tsx' },
        ],
      },
      {
        id: 'src/lib',
        name: 'lib',
        children: [
          { id: 'src/lib/utils.ts', name: 'utils.ts' },
          { id: 'src/lib/auth.ts', name: 'auth.ts' },
        ],
      },
      { id: 'src/index.ts', name: 'index.ts' },
    ],
  },
  { id: 'package.json', name: 'package.json' },
  { id: 'tsconfig.json', name: 'tsconfig.json' },
];

const allIds = [
  'src',
  'src/components',
  'src/components/button.tsx',
  'src/components/input.tsx',
  'src/components/dialog.tsx',
  'src/lib',
  'src/lib/utils.ts',
  'src/lib/auth.ts',
  'src/index.ts',
  'package.json',
  'tsconfig.json',
];

const meta: Meta<typeof Tree> = {
  title: 'Primitives/FileTree',
  component: Tree,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          width: '300px',
          height: '400px',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          padding: '8px',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Tree>;

/** Default file tree with auto-rendered elements */
export const Default: Story = {
  args: {
    elements: sampleElements,
    initialExpandedItems: allIds,
  },
};

/** Custom-rendered tree nodes with status icons */
export const WithStatusIcons: Story = {
  render: () => (
    <Tree initialExpandedItems={allIds} elements={sampleElements} sort="none">
      <Folder element="src" value="src">
        <Folder element="components" value="src/components">
          <File
            value="src/components/button.tsx"
            fileIcon={<FileEdit className="h-4 w-4 text-amber-600" />}
          >
            <span className="text-xs">button.tsx</span>
            <span className="ml-auto pl-2 text-[10px] text-green-600">+12</span>
          </File>
          <File
            value="src/components/input.tsx"
            fileIcon={<FilePlus className="h-4 w-4 text-green-600" />}
          >
            <span className="text-xs">input.tsx</span>
            <span className="ml-auto pl-2 text-[10px] text-green-600">+45</span>
          </File>
        </Folder>
        <Folder element="lib" value="src/lib">
          <File value="src/lib/utils.ts" fileIcon={<FileMinus className="h-4 w-4 text-red-600" />}>
            <span className="text-xs">utils.ts</span>
            <span className="ml-auto pl-2 text-[10px] text-red-600">-8</span>
          </File>
        </Folder>
      </Folder>
      <CollapseButton elements={sampleElements} className="mt-1" />
    </Tree>
  ),
};

/** Collapsed by default */
export const Collapsed: Story = {
  args: {
    elements: sampleElements,
    initialExpandedItems: [],
  },
};

/** With a collapse/expand all button */
export const WithCollapseButton: Story = {
  render: () => (
    <Tree elements={sampleElements} initialExpandedItems={allIds} sort="default">
      <Folder element="src" value="src">
        <Folder element="components" value="src/components">
          <File value="src/components/button.tsx">
            <span className="text-xs">button.tsx</span>
          </File>
          <File value="src/components/input.tsx">
            <span className="text-xs">input.tsx</span>
          </File>
          <File value="src/components/dialog.tsx">
            <span className="text-xs">dialog.tsx</span>
          </File>
        </Folder>
        <Folder element="lib" value="src/lib">
          <File value="src/lib/utils.ts">
            <span className="text-xs">utils.ts</span>
          </File>
          <File value="src/lib/auth.ts">
            <span className="text-xs">auth.ts</span>
          </File>
        </Folder>
        <File value="src/index.ts">
          <span className="text-xs">index.ts</span>
        </File>
      </Folder>
      <File value="package.json">
        <span className="text-xs">package.json</span>
      </File>
      <File value="tsconfig.json">
        <span className="text-xs">tsconfig.json</span>
      </File>
      <CollapseButton elements={sampleElements} className="mt-2" />
    </Tree>
  ),
};

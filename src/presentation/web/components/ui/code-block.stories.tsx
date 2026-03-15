import type { Meta, StoryObj } from '@storybook/react';
import { CodeBlock, DiffCodeBlock } from './code-block';
import type { DiffHunk } from './code-block';

/* ─── CodeBlock stories ─── */

const sampleCode = `import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-2">
      <Button onClick={() => setCount(count - 1)}>-</Button>
      <span>{count}</span>
      <Button onClick={() => setCount(count + 1)}>+</Button>
    </div>
  );
}`;

const codeBlockMeta: Meta<typeof CodeBlock> = {
  title: 'Primitives/CodeBlock',
  component: CodeBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default codeBlockMeta;
type Story = StoryObj<typeof CodeBlock>;

/** Default code block with syntax highlighting */
export const Default: Story = {
  args: {
    language: 'tsx',
    filename: 'Counter.tsx',
    code: sampleCode,
  },
};

/** With highlighted lines */
export const HighlightedLines: Story = {
  args: {
    language: 'tsx',
    filename: 'Counter.tsx',
    code: sampleCode,
    highlightLines: [4, 5, 6],
  },
};

/** With multiple tabs */
export const WithTabs: Story = {
  args: {
    language: 'tsx',
    filename: 'example',
    tabs: [
      {
        name: 'Component.tsx',
        code: sampleCode,
        language: 'tsx',
      },
      {
        name: 'styles.css',
        code: `.counter {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n}`,
        language: 'css',
      },
    ],
  },
};

/* ─── DiffCodeBlock stories ─── */

const sampleHunks: DiffHunk[] = [
  {
    header: '@@ -1,8 +1,12 @@',
    lines: [
      { type: 'context', content: "import { useState } from 'react';", oldNumber: 1, newNumber: 1 },
      {
        type: 'context',
        content: "import { Button } from '@/components/ui/button';",
        oldNumber: 2,
        newNumber: 2,
      },
      { type: 'added', content: "import { Input } from '@/components/ui/input';", newNumber: 3 },
      { type: 'added', content: "import { Label } from '@/components/ui/label';", newNumber: 4 },
      { type: 'context', content: '', oldNumber: 3, newNumber: 5 },
      { type: 'removed', content: 'export function LoginForm() {', oldNumber: 4 },
      {
        type: 'added',
        content: 'export function LoginForm({ onSubmit }: LoginFormProps) {',
        newNumber: 6,
      },
      {
        type: 'context',
        content: "  const [email, setEmail] = useState('');",
        oldNumber: 5,
        newNumber: 7,
      },
      {
        type: 'context',
        content: "  const [password, setPassword] = useState('');",
        oldNumber: 6,
        newNumber: 8,
      },
      {
        type: 'added',
        content: '  const [isLoading, setIsLoading] = useState(false);',
        newNumber: 9,
      },
    ],
  },
];

const additionsOnlyHunks: DiffHunk[] = [
  {
    header: '@@ -0,0 +1,5 @@',
    lines: [
      { type: 'added', content: "import { hash } from 'bcrypt';", newNumber: 1 },
      { type: 'added', content: '', newNumber: 2 },
      {
        type: 'added',
        content: 'export async function hashPassword(password: string) {',
        newNumber: 3,
      },
      { type: 'added', content: '  return hash(password, 10);', newNumber: 4 },
      { type: 'added', content: '}', newNumber: 5 },
    ],
  },
];

const deletionsOnlyHunks: DiffHunk[] = [
  {
    header: '@@ -1,5 +0,0 @@',
    lines: [
      { type: 'removed', content: '// Legacy auth utilities', oldNumber: 1 },
      { type: 'removed', content: 'export function oldLogin() {', oldNumber: 2 },
      { type: 'removed', content: "  return fetch('/api/login');", oldNumber: 3 },
      { type: 'removed', content: '}', oldNumber: 4 },
    ],
  },
];

export const DiffDefault: StoryObj<typeof DiffCodeBlock> = {
  render: () => (
    <div style={{ width: '600px' }}>
      <DiffCodeBlock
        language="tsx"
        filename="src/components/auth/login-form.tsx"
        hunks={sampleHunks}
      />
    </div>
  ),
};

export const DiffAdditionsOnly: StoryObj<typeof DiffCodeBlock> = {
  render: () => (
    <div style={{ width: '600px' }}>
      <DiffCodeBlock language="typescript" filename="src/lib/auth.ts" hunks={additionsOnlyHunks} />
    </div>
  ),
};

export const DiffDeletionsOnly: StoryObj<typeof DiffCodeBlock> = {
  render: () => (
    <div style={{ width: '600px' }}>
      <DiffCodeBlock
        language="typescript"
        filename="src/utils/legacy-auth.ts"
        hunks={deletionsOnlyHunks}
      />
    </div>
  ),
};

export const DiffEmpty: StoryObj<typeof DiffCodeBlock> = {
  render: () => (
    <div style={{ width: '600px' }}>
      <DiffCodeBlock language="typescript" filename="empty-file.ts" hunks={[]} />
    </div>
  ),
};

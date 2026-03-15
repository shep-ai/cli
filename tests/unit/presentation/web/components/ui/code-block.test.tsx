import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeBlock, DiffCodeBlock } from '@/components/ui/code-block';
import type { DiffHunk } from '@/components/ui/code-block';

// Mock clipboard API
const writeTextMock = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: { writeText: writeTextMock },
});

describe('CodeBlock', () => {
  it('renders filename', () => {
    render(<CodeBlock language="typescript" filename="hello.ts" code="const x = 1;" />);

    expect(screen.getByText('hello.ts')).toBeInTheDocument();
  });

  it('renders code content via syntax highlighter', () => {
    const { container } = render(
      <CodeBlock language="typescript" filename="hello.ts" code="const x = 1;" />
    );

    // SyntaxHighlighter breaks tokens into spans, so check the full text content
    expect(container.textContent).toContain('const');
    expect(container.textContent).toContain('x');
  });

  it('renders tab names when tabs are provided', () => {
    render(
      <CodeBlock
        language="typescript"
        filename="example"
        tabs={[
          { name: 'Tab A', code: 'const a = 1;', language: 'typescript' },
          { name: 'Tab B', code: 'const b = 2;', language: 'typescript' },
        ]}
      />
    );

    expect(screen.getByText('Tab A')).toBeInTheDocument();
    expect(screen.getByText('Tab B')).toBeInTheDocument();
  });

  it('switches active tab on click', () => {
    const { container } = render(
      <CodeBlock
        language="typescript"
        filename="example"
        tabs={[
          { name: 'Tab A', code: 'aaa_unique', language: 'text' },
          { name: 'Tab B', code: 'bbb_unique', language: 'text' },
        ]}
      />
    );

    // Initially shows Tab A content
    expect(container.textContent).toContain('aaa_unique');

    fireEvent.click(screen.getByText('Tab B'));
    expect(container.textContent).toContain('bbb_unique');
  });

  it('copies code to clipboard on copy click', async () => {
    render(<CodeBlock language="typescript" filename="hello.ts" code="const x = 1;" />);

    const copyButton = screen.getByRole('button');
    fireEvent.click(copyButton);
    expect(writeTextMock).toHaveBeenCalledWith('const x = 1;');
  });
});

describe('DiffCodeBlock', () => {
  const sampleHunks: DiffHunk[] = [
    {
      header: '@@ -1,4 +1,7 @@',
      lines: [
        { type: 'context', content: "import React from 'react';", oldNumber: 1, newNumber: 1 },
        { type: 'removed', content: 'function Login() {', oldNumber: 2 },
        { type: 'added', content: 'function Login({ onSubmit }: Props) {', newNumber: 2 },
        { type: 'context', content: '  return <div />;', oldNumber: 3, newNumber: 3 },
      ],
    },
  ];

  it('renders filename', () => {
    render(<DiffCodeBlock language="tsx" filename="src/login.tsx" hunks={sampleHunks} />);

    expect(screen.getByText('src/login.tsx')).toBeInTheDocument();
  });

  it('renders hunk header and code lines via syntax highlighter', () => {
    const { container } = render(
      <DiffCodeBlock language="tsx" filename="src/login.tsx" hunks={sampleHunks} />
    );

    const text = container.textContent ?? '';
    expect(text).toContain('@@ -1,4 +1,7 @@');
    expect(text).toContain('import');
    expect(text).toContain('React');
    expect(text).toContain('function');
    expect(text).toContain('Login');
  });

  it('renders empty state when no hunks', () => {
    render(<DiffCodeBlock language="tsx" filename="empty.ts" hunks={[]} />);

    expect(screen.getByText('No diff content available')).toBeInTheDocument();
  });

  it('renders multiple hunks', () => {
    const multiHunks: DiffHunk[] = [
      {
        header: '@@ -1,2 +1,3 @@',
        lines: [
          { type: 'context', content: 'line 1', oldNumber: 1, newNumber: 1 },
          { type: 'added', content: 'new line', newNumber: 2 },
        ],
      },
      {
        header: '@@ -10,2 +11,3 @@',
        lines: [
          { type: 'context', content: 'line 10', oldNumber: 10, newNumber: 11 },
          { type: 'removed', content: 'old line', oldNumber: 11 },
        ],
      },
    ];

    const { container } = render(
      <DiffCodeBlock language="typescript" filename="multi.ts" hunks={multiHunks} />
    );

    const text = container.textContent ?? '';
    expect(text).toContain('@@ -1,2 +1,3 @@');
    expect(text).toContain('@@ -10,2 +11,3 @@');
  });
});

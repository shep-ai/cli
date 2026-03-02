import type { Components } from 'react-markdown';

/**
 * Shared react-markdown component overrides for rendering markdown content
 * within review drawers (tech decisions, chat messages, etc.).
 */
export const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="text-muted-foreground mb-2 text-xs leading-relaxed last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} text-[11px]`}>{children}</code>
    ) : (
      <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-[11px]">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="bg-muted my-2 overflow-x-auto rounded-lg border p-3">{children}</pre>
  ),
  ul: ({ children }) => (
    <ul className="text-muted-foreground mb-2 list-disc space-y-1 pl-4 text-xs">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="text-muted-foreground mb-2 list-decimal space-y-1 pl-4 text-xs">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
};

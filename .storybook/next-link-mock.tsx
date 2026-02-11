/**
 * Mock for next/link used in Storybook. Next.js Link relies on process.env
 * and router context; this renders a plain anchor to avoid loading Next client code.
 */
import type { ComponentProps } from 'react';
import React from 'react';

type LinkProps = ComponentProps<'a'> & {
  href: string;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean;
  legacyBehavior?: boolean;
};

export default function Link({
  href,
  children,
  replace: _replace,
  scroll: _scroll,
  prefetch: _prefetch,
  legacyBehavior: _legacyBehavior,
  ...rest
}: LinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

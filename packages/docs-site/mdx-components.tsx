import type { MDXComponents } from 'mdx/types';
import { useMDXComponents as getDocsMDXComponents } from 'nextra-theme-docs';

const docsComponents = getDocsMDXComponents();

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...docsComponents,
    ...components,
  };
}

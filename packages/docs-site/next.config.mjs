import nextra from 'nextra';

const withNextra = nextra({});

export default withNextra({
  // eslint-disable-next-line no-undef
  ...(process.env.NEXTRA_EXPORT === '1' && { output: 'export' }),
  images: {
    unoptimized: true,
  },
  // eslint-disable-next-line no-undef
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  turbopack: {
    resolveAlias: {
      'next-mdx-import-source-file': './mdx-components.tsx',
    },
  },
});

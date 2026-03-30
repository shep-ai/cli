// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Introduction',
    },
    {
      type: 'category',
      label: 'Getting Started',
      link: {
        type: 'generated-index',
        title: 'Getting Started',
        description: 'Get up and running with Shep in minutes.',
        slug: '/getting-started',
      },
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      link: {
        type: 'doc',
        id: 'concepts/index',
      },
      items: [
        'concepts/sdlc-platform',
        'concepts/features',
        'concepts/agents',
        'concepts/sessions',
      ],
    },
    {
      type: 'category',
      label: 'CLI Reference',
      link: {
        type: 'doc',
        id: 'cli-reference/index',
      },
      items: [
        'cli-reference/feat',
        'cli-reference/repo',
        'cli-reference/agent',
        'cli-reference/run',
        'cli-reference/session',
        'cli-reference/ide',
        'cli-reference/tools',
        'cli-reference/install',
        'cli-reference/ui',
        'cli-reference/start',
        'cli-reference/stop',
        'cli-reference/restart',
        'cli-reference/status',
        'cli-reference/settings',
        'cli-reference/version',
        'cli-reference/upgrade',
      ],
    },
  ],
};

export default sidebars;

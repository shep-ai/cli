import type { Meta, StoryObj, Decorator } from '@storybook/react';
import { VersionBadge } from './version-badge';

/**
 * Decorator that mocks the /api/npm-version endpoint to return a specific latest version.
 */
function withNpmVersion(latest: string): Decorator {
  return (Story: React.FC) => {
    const originalFetch = window.fetch;
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/npm-version')) {
        return new Response(JSON.stringify({ latest }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;
    return <Story />;
  };
}

/** Decorator that mocks fetch to return an error for the npm version endpoint. */
const withNpmVersionError: Decorator = (Story: React.FC) => {
  const originalFetch = window.fetch;
  window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (url.includes('/api/npm-version')) {
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 502 });
    }
    return originalFetch(input, init);
  }) as typeof window.fetch;
  return <Story />;
};

const meta: Meta<typeof VersionBadge> = {
  title: 'Common/VersionBadge',
  component: VersionBadge,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof VersionBadge>;

/** Production mode — shows "v1.90.0" as dimmed text, no dev details in tooltip. */
export const Production: Story = {
  decorators: [withNpmVersion('1.90.0')],
  args: {
    version: '1.90.0',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
  },
};

/** Development mode — shows "1.90.0-dev", tooltip includes branch, commit, and path. */
export const Development: Story = {
  decorators: [withNpmVersion('1.90.0')],
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/version-badge',
    commitHash: '5a84c148b3e2f1a9c7d6e8b4a2f1c3d5e7f9a1b3',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    instancePath: '/home/user/projects/shep',
  },
};

/** Development mode with a long branch name — shown in tooltip. */
export const LongBranch: Story = {
  decorators: [withNpmVersion('1.90.0')],
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/056-version-badge-with-tooltip-and-build-info',
    commitHash: 'abc1234def5678',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    instancePath: '/home/user/very/deep/nested/project/path',
  },
};

/** Minimal info — no optional fields. */
export const Minimal: Story = {
  decorators: [withNpmVersion('1.0.0')],
  args: {
    version: '1.0.0',
  },
};

/** Update available — green dot appears, tooltip shows "Upgrade to v2.0.0" link. */
export const UpdateAvailable: Story = {
  decorators: [withNpmVersion('2.0.0')],
  args: {
    version: '1.90.0',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
  },
};

/** Update available in dev mode — green dot + upgrade link alongside dev info. */
export const UpdateAvailableDev: Story = {
  decorators: [withNpmVersion('2.0.0')],
  args: {
    version: '1.90.0',
    isDev: true,
    branch: 'feat/npm-version-checker',
    commitHash: '5a84c148b3e2f1a9c7d6e8b4a2f1c3d5e7f9a1b3',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
    instancePath: '/home/user/projects/shep',
  },
};

/** Fetch error — no update info shown, badge behaves normally. */
export const FetchError: Story = {
  decorators: [withNpmVersionError],
  args: {
    version: '1.90.0',
    packageName: '@shepai/cli',
    description: 'Autonomous AI Native SDLC Platform',
  },
};

import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { LogEntry } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { ServerLogViewerContent } from './server-log-viewer';

const meta: Meta<typeof ServerLogViewerContent> = {
  title: 'Common/ServerLogViewer',
  component: ServerLogViewerContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof ServerLogViewerContent>;

function makeLog(line: string, stream: 'stdout' | 'stderr' = 'stdout', offsetMs = 0): LogEntry {
  return {
    targetId: 'story-target',
    stream,
    line,
    timestamp: Date.now() + offsetMs,
  };
}

function InteractiveWrapper({ logs, isConnected }: { logs: LogEntry[]; isConnected: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <ServerLogViewerContent
      open={open}
      onOpenChange={setOpen}
      logs={logs}
      isConnected={isConnected}
    />
  );
}

/** Empty state — no log output yet. */
export const Empty: Story = {
  render: () => <InteractiveWrapper logs={[]} isConnected={true} />,
};

/** A few stdout-only lines. */
export const FewLines: Story = {
  render: () => (
    <InteractiveWrapper
      logs={[
        makeLog('$ npm run dev', 'stdout', 0),
        makeLog('', 'stdout', 10),
        makeLog('> my-app@1.0.0 dev', 'stdout', 20),
        makeLog('> next dev', 'stdout', 30),
        makeLog('', 'stdout', 40),
        makeLog('  ▲ Next.js 14.2.3', 'stdout', 50),
        makeLog('  - Local:        http://localhost:3000', 'stdout', 60),
        makeLog('  - Environments: .env.local', 'stdout', 70),
        makeLog('', 'stdout', 80),
        makeLog(' ✓ Ready in 1.2s', 'stdout', 90),
      ]}
      isConnected={true}
    />
  ),
};

/** Interleaved stdout and stderr showing color differentiation. */
export const MixedOutput: Story = {
  render: () => (
    <InteractiveWrapper
      logs={[
        makeLog('$ npm run dev', 'stdout', 0),
        makeLog('> next dev', 'stdout', 10),
        makeLog('  ▲ Next.js 14.2.3', 'stdout', 20),
        makeLog(
          '(node:12345) [DEP0040] DeprecationWarning: The punycode module is deprecated.',
          'stderr',
          30
        ),
        makeLog('Use `node:punycode` instead.', 'stderr', 31),
        makeLog('  - Local:        http://localhost:3000', 'stdout', 40),
        makeLog(' ✓ Ready in 1.8s', 'stdout', 50),
        makeLog(' ○ Compiling /page ...', 'stdout', 100),
        makeLog(' ✓ Compiled /page in 342ms', 'stdout', 200),
        makeLog('GET / 200 in 412ms', 'stdout', 300),
        makeLog('Warning: Each child in a list should have a unique "key" prop.', 'stderr', 310),
        makeLog('GET /api/data 200 in 23ms', 'stdout', 400),
        makeLog('GET /favicon.ico 304 in 2ms', 'stdout', 410),
        makeLog("Error: ENOENT: no such file or directory, open '/tmp/cache.json'", 'stderr', 500),
        makeLog('GET /api/users 500 in 156ms', 'stdout', 510),
      ]}
      isConnected={true}
    />
  ),
};

/** 100+ lines demonstrating scrollable content. */
export const ManyLines: Story = {
  render: () => {
    const logs: LogEntry[] = [];
    logs.push(makeLog('$ npm run dev', 'stdout', 0));
    logs.push(makeLog('> next dev', 'stdout', 10));
    logs.push(makeLog(' ✓ Ready in 1.2s', 'stdout', 20));
    for (let i = 0; i < 120; i++) {
      const method = ['GET', 'POST', 'PUT', 'DELETE'][i % 4];
      const path = ['/api/users', '/api/features', '/api/repos', '/api/deploy'][i % 4];
      const status = i % 15 === 0 ? 500 : i % 7 === 0 ? 404 : 200;
      const ms = Math.floor(Math.random() * 500) + 5;
      const stream: 'stdout' | 'stderr' = status >= 500 ? 'stderr' : 'stdout';
      logs.push(makeLog(`${method} ${path}/${i} ${status} in ${ms}ms`, stream, 100 + i * 10));
    }
    return <InteractiveWrapper logs={logs} isConnected={true} />;
  },
};

/** Lines exceeding viewport width showing wrap behavior. */
export const LongLines: Story = {
  render: () => (
    <InteractiveWrapper
      logs={[
        makeLog('Short line', 'stdout', 0),
        makeLog(
          "Error: Module not found: Can't resolve '@/components/features/really-long-component-name/that-goes-on-and-on/sub-component/deeply-nested-module/index.tsx' in '/Users/developer/projects/my-very-long-project-name/src/presentation/web/components/features'",
          'stderr',
          10
        ),
        makeLog(
          'at Object.resolve (webpack://my-app/node_modules/enhanced-resolve/lib/Resolver.js?:331:11) at Object.resolve (webpack://my-app/node_modules/enhanced-resolve/lib/Resolver.js?:331:11) at Object.resolve (webpack://my-app/node_modules/enhanced-resolve/lib/Resolver.js?:331:11)',
          'stderr',
          20
        ),
        makeLog('Normal log line here', 'stdout', 30),
        makeLog(
          JSON.stringify({
            level: 'info',
            message: 'Request processed',
            metadata: {
              userId: 'usr_abc123',
              path: '/api/features',
              method: 'POST',
              duration: 234,
              headers: { 'content-type': 'application/json', authorization: 'Bearer xxx...xxx' },
            },
          }),
          'stdout',
          40
        ),
        makeLog('Another normal line', 'stdout', 50),
      ]}
      isConnected={true}
    />
  ),
};

/** Disconnected state — shows server stopped message. */
export const Disconnected: Story = {
  render: () => (
    <InteractiveWrapper
      logs={[
        makeLog('$ npm run dev', 'stdout', 0),
        makeLog('> next dev', 'stdout', 10),
        makeLog(' ✓ Ready in 1.2s', 'stdout', 20),
        makeLog('GET / 200 in 412ms', 'stdout', 100),
        makeLog('GET /api/data 200 in 23ms', 'stdout', 200),
        makeLog('SIGTERM received, shutting down...', 'stderr', 300),
      ]}
      isConnected={false}
    />
  ),
};

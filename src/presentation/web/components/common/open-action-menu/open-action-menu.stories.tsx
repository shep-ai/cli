import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OpenActionMenu } from './open-action-menu';
import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

/* ---------------------------------------------------------------------------
 * Fixture helpers
 * ------------------------------------------------------------------------- */

function makeActions(overrides: Partial<FeatureActionsState> = {}): FeatureActionsState {
  return {
    openInIde: fn().mockName('openInIde'),
    openInShell: fn().mockName('openInShell'),
    openSpecsFolder: fn().mockName('openSpecsFolder'),
    openBrowserEditor: fn().mockName('openBrowserEditor'),
    stopBrowserEditor: fn().mockName('stopBrowserEditor'),
    ideLoading: false,
    shellLoading: false,
    specsLoading: false,
    browserEditorLoading: false,
    ideError: null,
    shellError: null,
    specsError: null,
    browserEditorError: null,
    browserEditorStatus: 'stopped',
    ...overrides,
  };
}

const defaultProps = {
  repositoryPath: '/Users/dev/my-project',
  showSpecs: true,
};

/* ---------------------------------------------------------------------------
 * Meta
 * ------------------------------------------------------------------------- */

const meta: Meta<typeof OpenActionMenu> = {
  title: 'Composed/OpenActionMenu',
  component: OpenActionMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof OpenActionMenu>;

/* ---------------------------------------------------------------------------
 * Default / baseline stories
 * ------------------------------------------------------------------------- */

/** Default menu with all actions including specs folder. */
export const Default: Story = {
  args: {
    ...defaultProps,
    actions: makeActions(),
  },
};

/** Menu without specs folder action. */
export const WithoutSpecs: Story = {
  args: {
    ...defaultProps,
    showSpecs: false,
    actions: makeActions(),
  },
};

/** Menu while IDE action is loading. */
export const Loading: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({ ideLoading: true }),
  },
};

/** Menu with an error on the IDE action. */
export const WithError: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({ ideError: 'Editor not found' }),
  },
};

/* ---------------------------------------------------------------------------
 * Browser editor state stories
 * ------------------------------------------------------------------------- */

/** Browser editor is running — shows "Stop Browser Editor" with green dot. */
export const BrowserEditorRunning: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({ browserEditorStatus: 'running' }),
  },
};

/** Browser editor is loading (starting up). */
export const BrowserEditorLoading: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({ browserEditorLoading: true }),
  },
};

/** Browser editor stop in progress — shows spinner on "Stop Browser Editor". */
export const BrowserEditorStopLoading: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({
      browserEditorStatus: 'running',
      browserEditorLoading: true,
    }),
  },
};

/** Browser editor has an error — shows alert icon. */
export const BrowserEditorError: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({
      browserEditorError: 'Failed to start: code-server binary not found',
    }),
  },
};

/** Browser editor status is null (not yet fetched). */
export const BrowserEditorUnknown: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({ browserEditorStatus: null }),
  },
};

/* ---------------------------------------------------------------------------
 * Combined state stories
 * ------------------------------------------------------------------------- */

/** Multiple errors — trigger button shows warning icon. */
export const MultipleErrors: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({
      ideError: 'IDE not found',
      browserEditorError: 'code-server not installed',
    }),
  },
};

/** Shell error with browser editor running. */
export const ShellErrorEditorRunning: Story = {
  args: {
    ...defaultProps,
    actions: makeActions({
      shellError: 'Terminal failed to open',
      browserEditorStatus: 'running',
    }),
  },
};

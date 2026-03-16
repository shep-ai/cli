import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { AnalysisMode } from '@shepai/core/application/ports/output/services/dev-environment-analyzer.interface';
import { DeployModeToggle } from './deploy-mode-toggle';

const meta: Meta<typeof DeployModeToggle> = {
  title: 'Common/DeployModeToggle',
  component: DeployModeToggle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DeployModeToggle>;

function InteractiveToggle({
  initialMode,
  autoDetectedMode,
}: {
  initialMode: AnalysisMode;
  autoDetectedMode?: AnalysisMode | null;
}) {
  const [mode, setMode] = useState<AnalysisMode>(initialMode);
  return (
    <DeployModeToggle mode={mode} autoDetectedMode={autoDetectedMode} onModeChange={setMode} />
  );
}

/** Fast mode selected — highlighted with Zap icon. */
export const FastSelected: Story = {
  render: () => <InteractiveToggle initialMode="fast" />,
};

/** Agent mode selected — highlighted with Bot icon. */
export const AgentSelected: Story = {
  render: () => <InteractiveToggle initialMode="agent" />,
};

/** Fast mode auto-detected — shows "(auto)" label next to Fast. */
export const AutoDetectedFast: Story = {
  render: () => <InteractiveToggle initialMode="fast" autoDetectedMode="fast" />,
};

/** Agent mode auto-detected — shows "(auto)" label next to Agent. */
export const AutoDetectedAgent: Story = {
  render: () => <InteractiveToggle initialMode="agent" autoDetectedMode="agent" />,
};

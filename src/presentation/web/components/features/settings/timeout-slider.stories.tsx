import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { TimeoutSlider } from './timeout-slider';

const meta: Meta<typeof TimeoutSlider> = {
  title: 'Features/Settings/TimeoutSlider',
  component: TimeoutSlider,
};

export default meta;
type Story = StoryObj<typeof TimeoutSlider>;

function TimeoutSliderDemo({
  label = 'Analyze',
  defaultSeconds = 1800,
}: {
  label?: string;
  defaultSeconds?: number;
}) {
  const [value, setValue] = useState(String(defaultSeconds));
  return (
    <div style={{ maxWidth: 500 }}>
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
      >
        <span style={{ fontSize: 14 }}>{label}</span>
        <TimeoutSlider
          id="demo-slider"
          testId="demo-slider-input"
          value={value}
          onChange={setValue}
          onBlur={() => undefined}
          defaultSeconds={defaultSeconds}
        />
      </div>
    </div>
  );
}

export const Default: Story = {
  render: () => <TimeoutSliderDemo />,
};

export const ShortTimeout: Story = {
  render: () => <TimeoutSliderDemo label="Analyze Repo" defaultSeconds={600} />,
};

export const LongTimeout: Story = {
  render: () => <TimeoutSliderDemo label="Implement" defaultSeconds={5400} />,
};

export const AllStages: Story = {
  render: () => (
    <div style={{ maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TimeoutSliderDemo label="Analyze" defaultSeconds={1800} />
      <TimeoutSliderDemo label="Requirements" defaultSeconds={1800} />
      <TimeoutSliderDemo label="Research" defaultSeconds={1800} />
      <TimeoutSliderDemo label="Plan" defaultSeconds={1800} />
      <TimeoutSliderDemo label="Implement" defaultSeconds={1800} />
      <TimeoutSliderDemo label="Merge" defaultSeconds={1800} />
    </div>
  ),
};
